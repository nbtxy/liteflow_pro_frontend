import { create } from 'zustand';
import type { Message, Conversation, ToolCall, Artifact, FileItem, FileAttachment } from '@/lib/types';
import { apiFetch } from '@/lib/api';
import { streamChat } from '@/lib/sse';
import { toast } from '@/components/ui/Toast';
import { translations } from '@/lib/i18n/translations';
import { getPreferredLanguage } from '@/lib/i18n/languageUtils';

// Helper to get current locale translations safely outside React components
const getT = () => {
  if (typeof window !== 'undefined') {
    const locale = getPreferredLanguage();
    return translations[locale] || translations.en;
  }
  return translations.en;
};

interface ChatStore {
  // 会话
  conversations: Conversation[];
  currentConversationId: string | null;
  conversationsLoading: boolean;

  // 消息
  messages: Message[];
  messagesLoading: boolean;

  // 流式状态
  isStreaming: boolean;
  abortController: AbortController | null;

  // 工具调用（当前流式消息的）
  currentToolCalls: ToolCall[];

  // Artifact
  artifacts: Artifact[];
  selectedArtifactId: string | null;

  // 文件面板
  artifactPanelOpen: boolean;
  artifactPanelTab: 'artifact' | 'files';
  files: FileItem[];

  // 全局文件预览状态
  previewFile: FileItem | null;

  // 文件上传
  pendingAttachments: FileAttachment[];

  // 侧边栏（移动端）
  sidebarOpen: boolean;

  // 侧边栏（桌面端）
  desktopSidebarOpen: boolean;

  // Actions
  loadConversations: () => Promise<void>;
  searchConversations: (query: string) => Promise<void>;
  selectConversation: (id: string) => Promise<void>;
  createConversation: () => void;
  deleteConversation: (id: string) => Promise<void>;
  renameConversation: (id: string, title: string) => Promise<void>;
  archiveConversation: (id: string) => Promise<void>;
  unarchiveConversation: (id: string) => Promise<void>;

  // 归档会话
  archivedConversations: Conversation[];
  archivedLoading: boolean;
  loadArchivedConversations: () => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  stopGeneration: () => void;
  regenerateLastMessage: () => Promise<void>;
  editAndResendMessage: (messageId: string, newContent: string) => Promise<void>;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleDesktopSidebar: () => void;
  setDesktopSidebarOpen: (open: boolean) => void;

  // 工具调用
  addToolCall: (toolCall: ToolCall) => void;
  updateToolCall: (toolUseId: string, update: Partial<ToolCall>) => void;

  // Artifact
  addArtifact: (artifact: Artifact) => void;
  updateArtifact: (artifactId: string, update: Partial<Artifact>) => void;
  selectArtifact: (artifactId: string | null) => void;
  setArtifactPanelOpen: (open: boolean) => void;
  setArtifactPanelTab: (tab: 'artifact' | 'files') => void;

  // 文件
  loadFiles: (conversationId: string) => Promise<void>;
  addFile: (file: FileItem) => void;
  removeFile: (index: number) => void;
  removeArtifact: (artifactId: string) => void;
  setPreviewFile: (file: FileItem | null) => void;
  addPendingAttachment: (attachment: FileAttachment) => void;
  updatePendingAttachment: (id: string, update: Partial<FileAttachment>) => void;
  removePendingAttachment: (id: string) => void;
  clearPendingAttachments: () => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  conversations: [],
  currentConversationId: null,
  conversationsLoading: false,
  archivedConversations: [],
  archivedLoading: false,
  messages: [],
  messagesLoading: false,
  isStreaming: false,
  abortController: null,
  currentToolCalls: [],
  artifacts: [],
  selectedArtifactId: null,
  artifactPanelOpen: false,
  artifactPanelTab: 'artifact',
  files: [],
  previewFile: null,
  pendingAttachments: [],
  sidebarOpen: false,
  desktopSidebarOpen: true,

  loadConversations: async () => {
    set({ conversationsLoading: true });
    try {
      const data = await apiFetch('/api/conversations');
      const list = Array.isArray(data)
        ? (data as Conversation[])
        : (((data as Record<string, unknown>)?.content ?? (data as Record<string, unknown>)?.items ?? []) as Conversation[]);
      set({ conversations: list });
    } catch {
      toast.error(getT().chat.loadConversationsFailed);
    } finally {
      set({ conversationsLoading: false });
    }
  },

  searchConversations: async (query: string) => {
    if (!query.trim()) {
      return get().loadConversations();
    }
    try {
      const data = await apiFetch(`/api/conversations/search?q=${encodeURIComponent(query)}`);
      const list = Array.isArray(data)
        ? (data as Conversation[])
        : (((data as Record<string, unknown>)?.content ?? (data as Record<string, unknown>)?.items ?? []) as Conversation[]);
      set({ conversations: list });
    } catch {
      toast.error(getT().chat.searchConversationsFailed);
    }
  },

  selectConversation: async (id: string) => {
    set({
      currentConversationId: id,
      sidebarOpen: false,
      artifacts: [],
      selectedArtifactId: null,
      files: [],
      currentToolCalls: [],
    });
    await get().loadMessages(id);
    // Load files for this conversation
    get().loadFiles(id);
  },

  createConversation: () => {
    set({
      currentConversationId: null,
      messages: [],
      sidebarOpen: false,
      artifacts: [],
      selectedArtifactId: null,
      artifactPanelOpen: false,
      files: [],
      currentToolCalls: [],
      pendingAttachments: [],
    });
  },

  deleteConversation: async (id: string) => {
    try {
      await apiFetch(`/api/conversations/${id}`, { method: 'DELETE' });
      const { conversations, currentConversationId } = get();
      const updated = conversations.filter((c) => c.id !== id);
      set({ conversations: updated });
      if (currentConversationId === id) {
        if (updated.length > 0) {
          await get().selectConversation(updated[0].id);
        } else {
          set({ currentConversationId: null, messages: [], artifacts: [], files: [] });
        }
      }
      toast.success(getT().common.deleteSuccess);
    } catch {
      toast.error(getT().chat.deleteConversationFailed);
    }
  },

  renameConversation: async (id: string, title: string) => {
    try {
      await apiFetch(`/api/conversations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      const { conversations } = get();
      set({
        conversations: conversations.map((c) =>
          c.id === id ? { ...c, title } : c
        ),
      });
      toast.success(getT().chat.renameSuccess);
    } catch {
      toast.error(getT().chat.renameConversationFailed);
    }
  },

  archiveConversation: async (id: string) => {
    try {
      await apiFetch(`/api/conversations/${id}/archive`, { method: 'POST' });
      const { conversations, currentConversationId } = get();
      const updated = conversations.filter((c) => c.id !== id);
      set({ conversations: updated });
      if (currentConversationId === id) {
        if (updated.length > 0) {
          await get().selectConversation(updated[0].id);
        } else {
          set({ currentConversationId: null, messages: [], artifacts: [], files: [] });
        }
      }
      toast.success(getT().chat.archiveSuccess);
      // 刷新归档列表
      get().loadArchivedConversations();
    } catch {
      toast.error(getT().chat.archiveConversationFailed);
    }
  },

  unarchiveConversation: async (id: string) => {
    try {
      await apiFetch(`/api/conversations/${id}/unarchive`, { method: 'POST' });
      const { archivedConversations } = get();
      const conv = archivedConversations.find((c) => c.id === id);
      set({
        archivedConversations: archivedConversations.filter((c) => c.id !== id),
      });
      if (conv) {
        set({ conversations: [conv, ...get().conversations] });
      }
      toast.success(getT().chat.unarchiveSuccess);
    } catch {
      toast.error(getT().chat.unarchiveConversationFailed);
    }
  },

  loadArchivedConversations: async () => {
    set({ archivedLoading: true });
    try {
      const data = await apiFetch('/api/conversations?archived=true');
      const list = Array.isArray(data) ? data : ((data as Record<string, unknown>)?.content ?? (data as Record<string, unknown>)?.items ?? []);
      set({ archivedConversations: list as Conversation[], archivedLoading: false });
    } catch {
      set({ archivedLoading: false });
    }
  },

  loadMessages: async (conversationId: string) => {
    set({ messagesLoading: true });
    try {
      const data = await apiFetch(`/api/conversations/${conversationId}/messages`);
      const list = Array.isArray(data)
        ? (data as Message[])
        : (((data as Record<string, unknown>)?.content ?? (data as Record<string, unknown>)?.items ?? []) as Message[]);
      set({ messages: list });
    } catch {
      toast.error(getT().chat.loadMessagesFailed);
    } finally {
      set({ messagesLoading: false });
    }
  },

  sendMessage: async (content: string) => {
    const { currentConversationId, messages, pendingAttachments } = get();

    // Build attachments info
    const doneAttachments = pendingAttachments.filter(a => a.status === 'done');

    // 立即添加 user 消息
    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      conversationId: currentConversationId ?? '',
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
      attachments: doneAttachments.length > 0 ? doneAttachments : undefined,
    };
    set({
      messages: [...messages, userMessage],
      isStreaming: true,
      currentToolCalls: [],
      pendingAttachments: [],
    });

    const abortController = new AbortController();
    set({ abortController });

    let assistantMessageId = '';
    let newConversationId = currentConversationId;

    try {
      for await (const event of streamChat(currentConversationId, content, abortController.signal)) {
        switch (event.type) {
          case 'stream_start': {
            assistantMessageId = event.messageId;
            if (event.conversationId && !currentConversationId) {
              newConversationId = event.conversationId;
              const newConv: Conversation = {
                id: event.conversationId,
                title: content.slice(0, 20) || '新对话',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
              set((state) => ({
                currentConversationId: event.conversationId,
                conversations: [newConv, ...state.conversations],
              }));
            }
            const assistantMessage: Message = {
              id: assistantMessageId,
              conversationId: newConversationId ?? '',
              role: 'assistant',
              content: '',
              createdAt: new Date().toISOString(),
              toolCalls: [],
            };
            set((state) => ({ messages: [...state.messages, assistantMessage] }));
            break;
          }
          case 'text_delta': {
            set((state) => {
              const msgs = [...state.messages];
              const last = msgs[msgs.length - 1];
              if (last && last.role === 'assistant') {
                msgs[msgs.length - 1] = { ...last, content: last.content + event.content };
              }
              return { messages: msgs };
            });
            break;
          }
          case 'tool_use_start': {
            const toolCall: ToolCall = {
              toolUseId: event.toolUseId,
              toolName: event.toolName,
              status: 'running',
              startedAt: Date.now(),
            };
            set((state) => {
              const toolCalls = [...state.currentToolCalls, toolCall];
              // Also attach to last assistant message
              const msgs = [...state.messages];
              const last = msgs[msgs.length - 1];
              if (last && last.role === 'assistant') {
                msgs[msgs.length - 1] = { ...last, toolCalls: [...(last.toolCalls || []), toolCall] };
              }
              return { currentToolCalls: toolCalls, messages: msgs };
            });
            break;
          }
          case 'tool_use_input': {
            set((state) => {
              const toolCalls = state.currentToolCalls.map(tc =>
                tc.toolUseId === event.toolUseId ? { ...tc, input: event.input } : tc
              );
              const msgs = [...state.messages];
              const last = msgs[msgs.length - 1];
              if (last && last.role === 'assistant') {
                const updatedToolCalls = (last.toolCalls || []).map(tc =>
                  tc.toolUseId === event.toolUseId ? { ...tc, input: event.input } : tc
                );
                msgs[msgs.length - 1] = { ...last, toolCalls: updatedToolCalls };
              }
              return { currentToolCalls: toolCalls, messages: msgs };
            });
            break;
          }
          case 'tool_result': {
            const now = Date.now();
            set((state) => {
              const toolCalls = state.currentToolCalls.map(tc =>
                tc.toolUseId === event.toolUseId
                  ? { ...tc, status: event.status as ToolCall['status'], duration: now - tc.startedAt }
                  : tc
              );
              const msgs = [...state.messages];
              const last = msgs[msgs.length - 1];
              if (last && last.role === 'assistant') {
                const updatedToolCalls = (last.toolCalls || []).map(tc =>
                  tc.toolUseId === event.toolUseId
                    ? { ...tc, status: event.status as ToolCall['status'], duration: now - tc.startedAt }
                    : tc
                );
                msgs[msgs.length - 1] = { ...last, toolCalls: updatedToolCalls };
              }
              return { currentToolCalls: toolCalls, messages: msgs };
            });
            break;
          }
          case 'artifact_created': {
            const artifact: Artifact = {
              id: event.artifactId,
              type: event.artifactType,
              title: event.title,
              language: event.language,
              content: event.content,
              url: event.url,
              version: event.version,
              versions: [event.version],
              conversationId: newConversationId ?? '',
              createdAt: new Date().toISOString(),
            };
            set((state) => ({
              artifacts: [...state.artifacts, artifact],
              selectedArtifactId: artifact.id,
              artifactPanelOpen: true,
              artifactPanelTab: 'artifact',
            }));
            break;
          }
          case 'artifact_updated': {
            set((state) => ({
              artifacts: state.artifacts.map(a =>
                a.id === event.artifactId
                  ? {
                      ...a,
                      version: event.version,
                      content: event.content ?? a.content,
                      url: event.url ?? a.url,
                      versions: [...(a.versions || []), event.version],
                    }
                  : a
              ),
              selectedArtifactId: event.artifactId,
              artifactPanelOpen: true,
            }));
            break;
          }
          case 'stream_end': {
            break;
          }
          case 'error': {
            set((state) => {
              const msgs = [...state.messages];
              const last = msgs[msgs.length - 1];
              if (last && last.role === 'assistant') {
                msgs[msgs.length - 1] = { ...last, content: last.content + `\n\n⚠️ ${event.message}` };
              } else {
                msgs.push({
                  id: `error-${Date.now()}`,
                  conversationId: newConversationId ?? '',
                  role: 'assistant',
                  content: `⚠️ ${event.message}`,
                  createdAt: new Date().toISOString(),
                });
              }
              return { messages: msgs };
            });
            break;
          }
        }
      }
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        toast.error(getT().chat.sendMessageFailed);
      }
    } finally {
      set({ isStreaming: false, abortController: null, currentToolCalls: [] });
      get().loadConversations();
      setTimeout(() => get().loadConversations(), 2000);
    }
  },

  stopGeneration: () => {
    const { abortController } = get();
    abortController?.abort();
    set({ isStreaming: false, abortController: null, currentToolCalls: [] });
  },

  regenerateLastMessage: async () => {
    const { messages, currentConversationId } = get();
    if (!currentConversationId || messages.length < 2) return;

    const newMessages = [...messages];
    if (newMessages[newMessages.length - 1]?.role === 'assistant') {
      newMessages.pop();
    }
    const lastUser = newMessages[newMessages.length - 1];
    if (!lastUser || lastUser.role !== 'user') return;

    set({ messages: newMessages, isStreaming: true, currentToolCalls: [] });

    const abortController = new AbortController();
    set({ abortController });

    try {
      for await (const event of streamChat(currentConversationId, lastUser.content, abortController.signal)) {
        switch (event.type) {
          case 'stream_start': {
            const assistantMessage: Message = {
              id: event.messageId,
              conversationId: currentConversationId,
              role: 'assistant',
              content: '',
              createdAt: new Date().toISOString(),
              toolCalls: [],
            };
            set((state) => ({ messages: [...state.messages, assistantMessage] }));
            break;
          }
          case 'text_delta': {
            set((state) => {
              const msgs = [...state.messages];
              const last = msgs[msgs.length - 1];
              if (last && last.role === 'assistant') {
                msgs[msgs.length - 1] = { ...last, content: last.content + event.content };
              }
              return { messages: msgs };
            });
            break;
          }
          case 'tool_use_start': {
            const toolCall: ToolCall = {
              toolUseId: event.toolUseId,
              toolName: event.toolName,
              status: 'running',
              startedAt: Date.now(),
            };
            set((state) => {
              const msgs = [...state.messages];
              const last = msgs[msgs.length - 1];
              if (last && last.role === 'assistant') {
                msgs[msgs.length - 1] = { ...last, toolCalls: [...(last.toolCalls || []), toolCall] };
              }
              return { currentToolCalls: [...state.currentToolCalls, toolCall], messages: msgs };
            });
            break;
          }
          case 'tool_use_input': {
            set((state) => {
              const toolCalls = state.currentToolCalls.map(tc =>
                tc.toolUseId === event.toolUseId ? { ...tc, input: event.input } : tc
              );
              const msgs = [...state.messages];
              const last = msgs[msgs.length - 1];
              if (last && last.role === 'assistant') {
                const updatedToolCalls = (last.toolCalls || []).map(tc =>
                  tc.toolUseId === event.toolUseId ? { ...tc, input: event.input } : tc
                );
                msgs[msgs.length - 1] = { ...last, toolCalls: updatedToolCalls };
              }
              return { currentToolCalls: toolCalls, messages: msgs };
            });
            break;
          }
          case 'tool_result': {
            const now = Date.now();
            set((state) => {
              const toolCalls = state.currentToolCalls.map(tc =>
                tc.toolUseId === event.toolUseId
                  ? { ...tc, status: event.status as ToolCall['status'], duration: now - tc.startedAt }
                  : tc
              );
              const msgs = [...state.messages];
              const last = msgs[msgs.length - 1];
              if (last && last.role === 'assistant') {
                const updatedToolCalls = (last.toolCalls || []).map(tc =>
                  tc.toolUseId === event.toolUseId
                    ? { ...tc, status: event.status as ToolCall['status'], duration: now - tc.startedAt }
                    : tc
                );
                msgs[msgs.length - 1] = { ...last, toolCalls: updatedToolCalls };
              }
              return { currentToolCalls: toolCalls, messages: msgs };
            });
            break;
          }
          case 'artifact_created': {
            const artifact: Artifact = {
              id: event.artifactId,
              type: event.artifactType,
              title: event.title,
              language: event.language,
              content: event.content,
              url: event.url,
              version: event.version,
              versions: [event.version],
              conversationId: currentConversationId,
              createdAt: new Date().toISOString(),
            };
            set((state) => ({
              artifacts: [...state.artifacts, artifact],
              selectedArtifactId: artifact.id,
              artifactPanelOpen: true,
              artifactPanelTab: 'artifact',
            }));
            break;
          }
          case 'artifact_updated': {
            set((state) => ({
              artifacts: state.artifacts.map(a =>
                a.id === event.artifactId
                  ? {
                      ...a,
                      version: event.version,
                      content: event.content ?? a.content,
                      url: event.url ?? a.url,
                      versions: [...(a.versions || []), event.version],
                    }
                  : a
              ),
              selectedArtifactId: event.artifactId,
              artifactPanelOpen: true,
            }));
            break;
          }
          case 'stream_end':
            break;
          case 'error': {
            set((state) => {
              const msgs = [...state.messages];
              const last = msgs[msgs.length - 1];
              if (last && last.role === 'assistant') {
                msgs[msgs.length - 1] = { ...last, content: last.content + `\n\n⚠️ ${event.message}` };
              } else {
                msgs.push({
                  id: `error-${Date.now()}`,
                  conversationId: currentConversationId,
                  role: 'assistant',
                  content: `⚠️ ${event.message}`,
                  createdAt: new Date().toISOString(),
                });
              }
              return { messages: msgs };
            });
            break;
          }
        }
      }
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        toast.error(getT().chat.sendMessageFailed);
      }
    } finally {
      set({ isStreaming: false, abortController: null, currentToolCalls: [] });
    }
  },

  editAndResendMessage: async (messageId: string, newContent: string) => {
    const { messages, currentConversationId } = get();
    if (!currentConversationId) return;

    const targetIndex = messages.findIndex((m) => m.id === messageId);
    if (targetIndex === -1) return;

    const newMessages = messages.slice(0, targetIndex);
    set({ messages: newMessages });

    await get().sendMessage(newContent);
  },

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
  toggleDesktopSidebar: () => set((state) => ({ desktopSidebarOpen: !state.desktopSidebarOpen })),
  setDesktopSidebarOpen: (open: boolean) => set({ desktopSidebarOpen: open }),

  // 工具调用
  addToolCall: (toolCall: ToolCall) => {
    set((state) => ({ currentToolCalls: [...state.currentToolCalls, toolCall] }));
  },
  updateToolCall: (toolUseId: string, update: Partial<ToolCall>) => {
    set((state) => ({
      currentToolCalls: state.currentToolCalls.map(tc =>
        tc.toolUseId === toolUseId ? { ...tc, ...update } : tc
      ),
    }));
  },

  // Artifact
  addArtifact: (artifact: Artifact) => {
    set((state) => ({
      artifacts: [...state.artifacts, artifact],
      selectedArtifactId: artifact.id,
      artifactPanelOpen: true,
    }));
  },
  updateArtifact: (artifactId: string, update: Partial<Artifact>) => {
    set((state) => ({
      artifacts: state.artifacts.map(a =>
        a.id === artifactId ? { ...a, ...update } : a
      ),
    }));
  },
  selectArtifact: (artifactId: string | null) => {
    set({ selectedArtifactId: artifactId, artifactPanelTab: 'artifact' });
    if (artifactId) {
      set({ artifactPanelOpen: true });
    }
  },
  setArtifactPanelOpen: (open: boolean) => set({ artifactPanelOpen: open }),
  setArtifactPanelTab: (tab: 'artifact' | 'files') => set({ artifactPanelTab: tab }),

  // 文件
  loadFiles: async (conversationId: string) => {
    try {
      const data = await apiFetch(`/api/conversations/${conversationId}/files`);
      const list = Array.isArray(data)
        ? (data as FileItem[])
        : (((data as Record<string, unknown>)?.content ?? (data as Record<string, unknown>)?.items ?? []) as FileItem[]);
      set({ files: list });
    } catch {
      // silently fail
    }
  },
  addFile: (file: FileItem) => {
    set((state) => ({ files: [...state.files, file] }));
  },
  removeFile: (index: number) => {
    set((state) => ({ files: state.files.filter((_, i) => i !== index) }));
  },
  removeArtifact: (artifactId: string) => {
    set((state) => ({
      artifacts: state.artifacts.filter(a => a.id !== artifactId),
      selectedArtifactId: state.selectedArtifactId === artifactId ? null : state.selectedArtifactId,
    }));
  },
  setPreviewFile: (file: FileItem | null) => set({ previewFile: file }),
  addPendingAttachment: (attachment: FileAttachment) => {
    set((state) => ({ pendingAttachments: [...state.pendingAttachments, attachment] }));
  },
  updatePendingAttachment: (id: string, update: Partial<FileAttachment>) => {
    set((state) => ({
      pendingAttachments: state.pendingAttachments.map(a =>
        a.id === id ? { ...a, ...update } : a
      ),
    }));
  },
  removePendingAttachment: (id: string) => {
    set((state) => ({
      pendingAttachments: state.pendingAttachments.filter(a => a.id !== id),
    }));
  },
  clearPendingAttachments: () => set({ pendingAttachments: [] }),
}));
