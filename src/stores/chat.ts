import { create } from 'zustand';
import type { Message, Conversation } from '@/lib/types';
import { apiFetch } from '@/lib/api';
import { streamChat } from '@/lib/sse';
import { toast } from '@/components/ui/Toast';

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

  loadConversations: async () => {
    set({ conversationsLoading: true });
    try {
      const res = await apiFetch('/api/conversations');
      if (res.ok) {
        const data = await res.json();
        set({ conversations: data.data?.items ?? data.data ?? [] });
      }
    } catch {
      toast.error('加载会话列表失败');
    } finally {
      set({ conversationsLoading: false });
    }
  },

  searchConversations: async (query: string) => {
    if (!query.trim()) {
      return get().loadConversations();
    }
    try {
      const res = await apiFetch(`/api/conversations/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        set({ conversations: data.data?.items ?? data.data ?? [] });
      }
    } catch {
      toast.error('搜索会话失败');
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
      const res = await apiFetch(`/api/conversations/${id}`, { method: 'DELETE' });
      if (res.ok) {
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
        toast.success('删除成功');
      }
    } catch {
      toast.error('删除会话失败');
    }
  },

  loadMessages: async (conversationId: string) => {
    set({ messagesLoading: true });
    try {
      const res = await apiFetch(`/api/conversations/${conversationId}/messages`);
      if (res.ok) {
        const data = await res.json();
        set({ messages: data.data?.items ?? data.data ?? [] });
      }
    } catch {
      toast.error('加载历史消息失败');
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
              set({ currentConversationId: event.conversationId });
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
        toast.error('消息发送失败，请检查网络连接');
      }
    } finally {
      set({ isStreaming: false, abortController: null });
      // 刷新会话列表（标题可能已更新）
      get().loadConversations();
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

    // 找到最后一条 user 消息
    let lastUserContent = '';
    const newMessages = [...messages];
    // 移除最后一条 assistant 消息
    if (newMessages[newMessages.length - 1]?.role === 'assistant') {
      newMessages.pop();
    }
    // 获取最后一条 user 消息内容
    const lastUser = newMessages[newMessages.length - 1];
    if (lastUser?.role === 'user') {
      lastUserContent = lastUser.content;
    }

    if (!lastUserContent) return;

    set({ messages: newMessages });

    // 用相同内容重新发送
    await get().sendMessage(lastUserContent);
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
}));
