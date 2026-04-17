import { create } from 'zustand';
import type { Message, Conversation, ToolCall, Artifact, FileItem, FileAttachment, QuotedMessage } from '@/lib/types';
import { apiFetch } from '@/lib/api';
import { streamChat, regenerateChat } from '@/lib/sse';
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
  activeRequestId: string | null;

  // Artifact
  artifacts: Artifact[];
  selectedArtifactId: string | null;

  // 文件面板
  artifactPanelOpen: boolean;
  files: FileItem[];

  // 全局文件预览状态
  previewFile: FileItem | null;

  // 文件上传
  pendingAttachments: FileAttachment[];
  quotedMessage: QuotedMessage | null;

  // 侧边栏（移动端）
  sidebarOpen: boolean;

  // 侧边栏（桌面端）
  desktopSidebarOpen: boolean;

  // Actions
  loadConversations: () => Promise<void>;
  searchConversations: (query: string) => Promise<void>;
  selectConversation: (id: string) => Promise<void>;
  createConversation: () => void;
  ensureConversation: () => Promise<string>;
  deleteConversation: (id: string) => Promise<void>;
  renameConversation: (id: string, title: string) => Promise<void>;
  archiveConversation: (id: string) => Promise<void>;
  unarchiveConversation: (id: string) => Promise<void>;

  // 归档会话
  archivedConversations: Conversation[];
  archivedLoading: boolean;
  loadArchivedConversations: () => Promise<void>;

  // 消息操作
  loadMessages: (conversationId: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  stopGeneration: () => void;
  regenerateLastMessage: () => Promise<void>;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleDesktopSidebar: () => void;
  setDesktopSidebarOpen: (open: boolean) => void;

  // Artifact
  addArtifact: (artifact: Artifact) => void;
  updateArtifact: (artifactId: string, update: Partial<Artifact>) => void;
  selectArtifact: (artifactId: string | null) => void;
  setArtifactPanelOpen: (open: boolean) => void;

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
  setQuotedMessage: (message: QuotedMessage | null) => void;
  clearQuotedMessage: () => void;
  resetChatState: () => void;
}

let pendingEnsureConversationPromise: Promise<string> | null = null;

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
  activeRequestId: null,
  artifacts: [],
  selectedArtifactId: null,
  artifactPanelOpen: false,
  files: [],
  previewFile: null,
  pendingAttachments: [],
  quotedMessage: null,
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
      quotedMessage: null,
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
      pendingAttachments: [],
      quotedMessage: null,
    });
  },

  ensureConversation: async () => {
    const { currentConversationId } = get();
    if (currentConversationId) {
      return currentConversationId;
    }
    if (pendingEnsureConversationPromise) {
      return pendingEnsureConversationPromise;
    }
    
    pendingEnsureConversationPromise = (async () => {
      try {
        const data = await apiFetch('/api/conversations', { method: 'POST' });
        const conv = data as Conversation;
        if (!conv || !conv.id) {
          throw new Error('Invalid response');
        }
        set((state) => ({
          currentConversationId: conv.id,
          conversations: [conv, ...state.conversations],
        }));
        return conv.id;
      } catch {
        toast.error(getT().chat.loadConversationsFailed || '创建会话失败');
        throw new Error('Failed to create conversation');
      } finally {
        pendingEnsureConversationPromise = null;
      }
    })();
    return pendingEnsureConversationPromise;
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
      
      // Process messages: normalize attachments
      const processedList = list.map(msg => {
        const updatedMsg = { ...msg };
        if (updatedMsg.attachments && updatedMsg.attachments.length > 0) {
          updatedMsg.attachments = updatedMsg.attachments.map((att: Partial<FileAttachment>, idx: number) => ({
            id: att.id || `att-${idx}-${Date.now()}`,
            name: att.name || 'Unknown File',
            size: att.size || 0,
            status: att.status || 'done',
            progress: att.progress || 100,
            url: att.url,
            type: att.type,
            mimeType: att.mimeType,
          }));
        }
        return updatedMsg;
      });

      set({ messages: processedList });
    } catch {
      toast.error(getT().chat.loadMessagesFailed);
    } finally {
      set({ messagesLoading: false });
    }
  },

  sendMessage: async (content: string) => {
    const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const abortController = new AbortController();
    const snapshot = get();
    if (snapshot.isStreaming) {
      return;
    }

    const context = {
      currentConversationId: snapshot.currentConversationId,
      doneAttachments: snapshot.pendingAttachments.filter(a => a.status === 'done'),
      quotedMessage: snapshot.quotedMessage,
    };

    // Atomic guard + state transition to avoid duplicate sends from rapid clicks/enter.
    set((state) => {
      if (state.isStreaming) return state;

      const userMessage: Message = {
        id: `temp-${Date.now()}`,
        conversationId: context.currentConversationId ?? '',
        role: 'user',
        content,
        createdAt: new Date().toISOString(),
        attachments: context.doneAttachments.length > 0 ? context.doneAttachments : undefined,
        quotedMessage: context.quotedMessage ?? undefined,
      };

      return {
        ...state,
        messages: [...state.messages, userMessage],
        isStreaming: true,
        abortController,
        activeRequestId: requestId,
        pendingAttachments: [],
        quotedMessage: null,
      };
    });

    if (get().activeRequestId !== requestId) {
      return;
    }

    let assistantMessageId = '';
    let newConversationId = context.currentConversationId;

    try {
      for await (const event of streamChat(
        context.currentConversationId,
        content,
        context.doneAttachments,
        context.quotedMessage ?? undefined,
        abortController.signal
      )) {
        if (get().activeRequestId !== requestId) {
          break;
        }
        switch (event.type) {
          case 'stream_start': {
            assistantMessageId = event.messageId;
            if (event.conversationId && !context.currentConversationId) {
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
              contentParts: [],
            };
            set((state) => ({ messages: [...state.messages, assistantMessage] }));
            break;
          }
          case 'text_delta': {
            set((state) => {
              const msgs = [...state.messages];
              const last = msgs[msgs.length - 1];
              if (last && last.role === 'assistant') {
                const parts = [...(last.contentParts || [])];
                const lastPart = parts[parts.length - 1];
                if (lastPart && lastPart.type === 'text') {
                  parts[parts.length - 1] = { type: 'text', text: lastPart.text + event.content };
                } else {
                  parts.push({ type: 'text', text: event.content });
                }
                msgs[msgs.length - 1] = { ...last, content: last.content + event.content, contentParts: parts };
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
                const parts = [...(last.contentParts || [])];
                const exists = parts.some(
                  p => p.type === 'tool_use' && p.toolCall.toolUseId === event.toolUseId
                );
                if (!exists) {
                  parts.push({ type: 'tool_use', toolCall });
                }
                msgs[msgs.length - 1] = { ...last, contentParts: parts };
              }
              return { messages: msgs };
            });
            break;
          }
          case 'tool_use_input_delta': {
            set((state) => {
              const msgs = [...state.messages];
              const last = msgs[msgs.length - 1];
              if (last && last.role === 'assistant') {
                const parts = (last.contentParts || []).map(p => {
                  if (p.type !== 'tool_use' || p.toolCall.toolUseId !== event.toolUseId) {
                    return p;
                  }
                  const prev = typeof p.toolCall.input === 'string' ? p.toolCall.input : '';
                  return {
                    type: 'tool_use' as const,
                    toolCall: { ...p.toolCall, input: prev + (event.input_delta || '') },
                  };
                });
                msgs[msgs.length - 1] = { ...last, contentParts: parts };
              }
              return { messages: msgs };
            });
            break;
          }
          case 'tool_use_input': {
            set((state) => {
              const msgs = [...state.messages];
              const last = msgs[msgs.length - 1];
              if (last && last.role === 'assistant') {
                const parts = (last.contentParts || []).map(p =>
                  p.type === 'tool_use' && p.toolCall.toolUseId === event.toolUseId
                    ? { type: 'tool_use' as const, toolCall: { ...p.toolCall, input: event.input } }
                    : p
                );
                msgs[msgs.length - 1] = { ...last, contentParts: parts };
              }
              return { messages: msgs };
            });
            break;
          }
          case 'tool_result': {
            const now = Date.now();
            set((state) => {
              const updateTC = (tc: ToolCall) =>
                tc.toolUseId === event.toolUseId
                  ? { ...tc, status: event.status as ToolCall['status'], duration: now - tc.startedAt }
                  : tc;
              const msgs = [...state.messages];
              const last = msgs[msgs.length - 1];
              if (last && last.role === 'assistant') {
                const mappedParts = (last.contentParts || []).map(p =>
                  p.type === 'tool_use' && p.toolCall.toolUseId === event.toolUseId
                    ? { type: 'tool_use' as const, toolCall: updateTC(p.toolCall) }
                    : p
                );
                const hasResultPart = mappedParts.some(
                  p => p.type === 'tool_result' && p.toolUseId === event.toolUseId
                );
                const parts = hasResultPart
                  ? mappedParts
                  : [
                      ...mappedParts,
                      {
                        type: 'tool_result' as const,
                        toolUseId: event.toolUseId,
                        status: event.status,
                        content: event.content,
                      },
                    ];
                msgs[msgs.length - 1] = { ...last, contentParts: parts };
              }
              return { messages: msgs };
            });
            break;
          }
          case 'delegation_start': {
            set((state) => {
              const msgs = [...state.messages];
              const last = msgs[msgs.length - 1];
              if (last && last.role === 'assistant') {
                const parts = [...(last.contentParts || [])];
                parts.push({
                  type: 'delegation_start',
                  subAgentId: event.subAgentId,
                  subAgentName: event.subAgentName,
                  task: event.task,
                });
                msgs[msgs.length - 1] = { ...last, contentParts: parts };
              }
              return { messages: msgs };
            });
            break;
          }
          case 'delegation_delta': {
            set((state) => {
              const msgs = [...state.messages];
              const last = msgs[msgs.length - 1];
              if (last && last.role === 'assistant') {
                const parts = [...(last.contentParts || [])];
                const lastPart = parts[parts.length - 1];
                if (
                  lastPart &&
                  lastPart.type === 'delegation_delta' &&
                  lastPart.subAgentId === event.subAgentId
                ) {
                  parts[parts.length - 1] = {
                    type: 'delegation_delta',
                    subAgentId: event.subAgentId,
                    subAgentName: event.subAgentName,
                    content: (lastPart.content || '') + (event.content || ''),
                  };
                } else {
                  parts.push({
                    type: 'delegation_delta',
                    subAgentId: event.subAgentId,
                    subAgentName: event.subAgentName,
                    content: event.content,
                  });
                }
                msgs[msgs.length - 1] = { ...last, contentParts: parts };
              }
              return { messages: msgs };
            });
            break;
          }
          case 'delegation_end': {
            set((state) => {
              const msgs = [...state.messages];
              const last = msgs[msgs.length - 1];
              if (last && last.role === 'assistant') {
                const parts = [...(last.contentParts || [])];
                parts.push({
                  type: 'delegation_end',
                  subAgentId: event.subAgentId,
                  subAgentName: event.subAgentName,
                  result: event.result,
                });
                msgs[msgs.length - 1] = { ...last, contentParts: parts };
              }
              return { messages: msgs };
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
      set((state) => {
        if (state.activeRequestId !== requestId) {
          return state;
        }
        return {
          ...state,
          isStreaming: false,
          abortController: null,
          activeRequestId: null,
        };
      });
      get().loadConversations();
      setTimeout(() => get().loadConversations(), 2000);
    }
  },

  stopGeneration: () => {
    const { abortController } = get();
    abortController?.abort();
    set({ isStreaming: false, abortController: null, activeRequestId: null });
  },

  regenerateLastMessage: async () => {
    const { messages, currentConversationId } = get();
    if (!currentConversationId || messages.length < 2) return;

    const newMessages = [...messages];
    let assistantMessageIdToRegenerate: string | null = null;

    if (newMessages[newMessages.length - 1]?.role === 'assistant') {
      const assistantMsg = newMessages.pop()!;
      if (!assistantMsg.id.startsWith('error-')) {
        assistantMessageIdToRegenerate = assistantMsg.id;
      }
    }
    const lastUser = newMessages[newMessages.length - 1];
    if (!lastUser || lastUser.role !== 'user') return;

    set({ messages: newMessages, isStreaming: true });

    const abortController = new AbortController();
    set({ abortController });

    try {
      const chatStream = assistantMessageIdToRegenerate
        ? regenerateChat(currentConversationId, assistantMessageIdToRegenerate, abortController.signal)
        : streamChat(
            currentConversationId,
            lastUser.content,
            lastUser.attachments,
            lastUser.quotedMessage,
            abortController.signal
          );

      for await (const event of chatStream) {
        switch (event.type) {
          case 'stream_start': {
            const assistantMessage: Message = {
              id: event.messageId,
              conversationId: currentConversationId,
              role: 'assistant',
              content: '',
              createdAt: new Date().toISOString(),
              contentParts: [],
            };
            set((state) => ({ messages: [...state.messages, assistantMessage] }));
            break;
          }
          case 'text_delta': {
            set((state) => {
              const msgs = [...state.messages];
              const last = msgs[msgs.length - 1];
              if (last && last.role === 'assistant') {
                const parts = [...(last.contentParts || [])];
                const lastPart = parts[parts.length - 1];
                if (lastPart && lastPart.type === 'text') {
                  parts[parts.length - 1] = { type: 'text', text: lastPart.text + event.content };
                } else {
                  parts.push({ type: 'text', text: event.content });
                }
                msgs[msgs.length - 1] = { ...last, content: last.content + event.content, contentParts: parts };
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
                const parts = [...(last.contentParts || [])];
                const exists = parts.some(
                  p => p.type === 'tool_use' && p.toolCall.toolUseId === event.toolUseId
                );
                if (!exists) {
                  parts.push({ type: 'tool_use', toolCall });
                }
                msgs[msgs.length - 1] = { ...last, contentParts: parts };
              }
              return { messages: msgs };
            });
            break;
          }
          case 'tool_use_input_delta': {
            set((state) => {
              const msgs = [...state.messages];
              const last = msgs[msgs.length - 1];
              if (last && last.role === 'assistant') {
                const parts = (last.contentParts || []).map(p => {
                  if (p.type !== 'tool_use' || p.toolCall.toolUseId !== event.toolUseId) {
                    return p;
                  }
                  const prev = typeof p.toolCall.input === 'string' ? p.toolCall.input : '';
                  return {
                    type: 'tool_use' as const,
                    toolCall: { ...p.toolCall, input: prev + (event.input_delta || '') },
                  };
                });
                msgs[msgs.length - 1] = { ...last, contentParts: parts };
              }
              return { messages: msgs };
            });
            break;
          }
          case 'tool_use_input': {
            set((state) => {
              const msgs = [...state.messages];
              const last = msgs[msgs.length - 1];
              if (last && last.role === 'assistant') {
                const parts = (last.contentParts || []).map(p =>
                  p.type === 'tool_use' && p.toolCall.toolUseId === event.toolUseId
                    ? { type: 'tool_use' as const, toolCall: { ...p.toolCall, input: event.input } }
                    : p
                );
                msgs[msgs.length - 1] = { ...last, contentParts: parts };
              }
              return { messages: msgs };
            });
            break;
          }
          case 'tool_result': {
            const now = Date.now();
            set((state) => {
              const updateTC = (tc: ToolCall) =>
                tc.toolUseId === event.toolUseId
                  ? { ...tc, status: event.status as ToolCall['status'], duration: now - tc.startedAt }
                  : tc;
              const msgs = [...state.messages];
              const last = msgs[msgs.length - 1];
              if (last && last.role === 'assistant') {
                const mappedParts = (last.contentParts || []).map(p =>
                  p.type === 'tool_use' && p.toolCall.toolUseId === event.toolUseId
                    ? { type: 'tool_use' as const, toolCall: updateTC(p.toolCall) }
                    : p
                );
                const hasResultPart = mappedParts.some(
                  p => p.type === 'tool_result' && p.toolUseId === event.toolUseId
                );
                const parts = hasResultPart
                  ? mappedParts
                  : [
                      ...mappedParts,
                      {
                        type: 'tool_result' as const,
                        toolUseId: event.toolUseId,
                        status: event.status,
                        content: event.content,
                      },
                    ];
                msgs[msgs.length - 1] = { ...last, contentParts: parts };
              }
              return { messages: msgs };
            });
            break;
          }
          case 'delegation_start': {
            set((state) => {
              const msgs = [...state.messages];
              const last = msgs[msgs.length - 1];
              if (last && last.role === 'assistant') {
                const parts = [...(last.contentParts || [])];
                parts.push({
                  type: 'delegation_start',
                  subAgentId: event.subAgentId,
                  subAgentName: event.subAgentName,
                  task: event.task,
                });
                msgs[msgs.length - 1] = { ...last, contentParts: parts };
              }
              return { messages: msgs };
            });
            break;
          }
          case 'delegation_delta': {
            set((state) => {
              const msgs = [...state.messages];
              const last = msgs[msgs.length - 1];
              if (last && last.role === 'assistant') {
                const parts = [...(last.contentParts || [])];
                const lastPart = parts[parts.length - 1];
                if (
                  lastPart &&
                  lastPart.type === 'delegation_delta' &&
                  lastPart.subAgentId === event.subAgentId
                ) {
                  parts[parts.length - 1] = {
                    type: 'delegation_delta',
                    subAgentId: event.subAgentId,
                    subAgentName: event.subAgentName,
                    content: (lastPart.content || '') + (event.content || ''),
                  };
                } else {
                  parts.push({
                    type: 'delegation_delta',
                    subAgentId: event.subAgentId,
                    subAgentName: event.subAgentName,
                    content: event.content,
                  });
                }
                msgs[msgs.length - 1] = { ...last, contentParts: parts };
              }
              return { messages: msgs };
            });
            break;
          }
          case 'delegation_end': {
            set((state) => {
              const msgs = [...state.messages];
              const last = msgs[msgs.length - 1];
              if (last && last.role === 'assistant') {
                const parts = [...(last.contentParts || [])];
                parts.push({
                  type: 'delegation_end',
                  subAgentId: event.subAgentId,
                  subAgentName: event.subAgentName,
                  result: event.result,
                });
                msgs[msgs.length - 1] = { ...last, contentParts: parts };
              }
              return { messages: msgs };
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
      set({ isStreaming: false, abortController: null });
    }
  },

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
  toggleDesktopSidebar: () => set((state) => ({ desktopSidebarOpen: !state.desktopSidebarOpen })),
  setDesktopSidebarOpen: (open: boolean) => set({ desktopSidebarOpen: open }),

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
    set({ selectedArtifactId: artifactId });
    if (artifactId) {
      set({ artifactPanelOpen: true });
    }
  },
  setArtifactPanelOpen: (open: boolean) => set({ artifactPanelOpen: open }),

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
  setQuotedMessage: (message: QuotedMessage | null) => set({ quotedMessage: message }),
  clearQuotedMessage: () => set({ quotedMessage: null }),
  resetChatState: () => {
    get().abortController?.abort();
    set((state) => ({
      conversations: [],
      currentConversationId: null,
      conversationsLoading: false,
      archivedConversations: [],
      archivedLoading: false,
      messages: [],
      messagesLoading: false,
      isStreaming: false,
      abortController: null,
      activeRequestId: null,
      artifacts: [],
      selectedArtifactId: null,
      artifactPanelOpen: false,
      files: [],
      previewFile: null,
      pendingAttachments: [],
      quotedMessage: null,
      sidebarOpen: false,
      desktopSidebarOpen: state.desktopSidebarOpen,
    }));
  },
}));
