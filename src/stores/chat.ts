import { create } from 'zustand';
import type { Message, Conversation } from '@/lib/types';
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
  loadMessages: (conversationId: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  stopGeneration: () => void;
  regenerateLastMessage: () => Promise<void>;
  editAndResendMessage: (messageId: string, newContent: string) => Promise<void>;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleDesktopSidebar: () => void;
  setDesktopSidebarOpen: (open: boolean) => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  conversations: [],
  currentConversationId: null,
  conversationsLoading: false,
  messages: [],
  messagesLoading: false,
  isStreaming: false,
  abortController: null,
  sidebarOpen: false,
  desktopSidebarOpen: true,

  loadConversations: async () => {
    set({ conversationsLoading: true });
    try {
      const data = await apiFetch('/api/conversations');
      const list = Array.isArray(data) ? data : (data?.content ?? data?.items ?? []);
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
      const list = Array.isArray(data) ? data : (data?.content ?? data?.items ?? []);
      set({ conversations: list });
    } catch {
      toast.error(getT().chat.searchConversationsFailed);
    }
  },

  selectConversation: async (id: string) => {
    set({ currentConversationId: id, sidebarOpen: false });
    await get().loadMessages(id);
  },

  createConversation: () => {
    set({
      currentConversationId: null,
      messages: [],
      sidebarOpen: false,
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
          set({ currentConversationId: null, messages: [] });
        }
      }
      toast.success(getT().common.deleteSuccess);
    } catch {
      toast.error(getT().chat.deleteConversationFailed);
    }
  },

  loadMessages: async (conversationId: string) => {
    set({ messagesLoading: true });
    try {
      const data = await apiFetch(`/api/conversations/${conversationId}/messages`);
      const list = Array.isArray(data) ? data : (data?.content ?? data?.items ?? []);
      set({ messages: list });
    } catch {
      toast.error(getT().chat.loadMessagesFailed);
    } finally {
      set({ messagesLoading: false });
    }
  },

  sendMessage: async (content: string) => {
    const { currentConversationId, messages } = get();

    // 立即添加 user 消息
    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      conversationId: currentConversationId ?? '',
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };
    set({ messages: [...messages, userMessage], isStreaming: true });

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
              // 新会话：立即加入侧栏列表，用用户消息作临时标题
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
          case 'stream_end': {
            break;
          }
          case 'error': {
            set((state) => {
              const msgs = [...state.messages];
              const last = msgs[msgs.length - 1];
              if (last && last.role === 'assistant') {
                // 已有 assistant 消息，追加错误到内容中
                msgs[msgs.length - 1] = { ...last, content: last.content + `\n\n⚠️ ${event.message}` };
              } else {
                // stream_start 之前就出错了，创建一条 assistant 错误消息
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
      set({ isStreaming: false, abortController: null });
      // 立即刷新一次会话列表
      get().loadConversations();
      // 延迟再刷新一次，等待后端异步生成标题
      setTimeout(() => get().loadConversations(), 2000);
    }
  },

  stopGeneration: () => {
    const { abortController } = get();
    abortController?.abort();
    set({ isStreaming: false, abortController: null });
  },

  regenerateLastMessage: async () => {
    const { messages, currentConversationId } = get();
    if (!currentConversationId || messages.length < 2) return;

    // 找到最后一条 user 消息的内容
    const newMessages = [...messages];
    // 移除最后一条 assistant 消息
    if (newMessages[newMessages.length - 1]?.role === 'assistant') {
      newMessages.pop();
    }
    const lastUser = newMessages[newMessages.length - 1];
    if (!lastUser || lastUser.role !== 'user') return;

    // 只移除旧的 assistant 回复，不重新插入 user 消息
    set({ messages: newMessages, isStreaming: true });

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

  editAndResendMessage: async (messageId: string, newContent: string) => {
    const { messages, currentConversationId } = get();
    if (!currentConversationId) return;

    const targetIndex = messages.findIndex((m) => m.id === messageId);
    if (targetIndex === -1) return;

    // 截断历史：保留目标消息之前的所有消息
    const newMessages = messages.slice(0, targetIndex);
    set({ messages: newMessages });

    // 用新内容重新发送
    await get().sendMessage(newContent);
  },

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
  toggleDesktopSidebar: () => set((state) => ({ desktopSidebarOpen: !state.desktopSidebarOpen })),
  setDesktopSidebarOpen: (open: boolean) => set({ desktopSidebarOpen: open }),
}));
