'use client';

import { useEffect, useState, useCallback } from 'react';
import { useChatStore } from '@/stores/chat';
import { Spinner } from '@/components/ui/Spinner';
import { UserMenu } from './UserMenu';

export function ConversationList() {
  const {
    conversations,
    currentConversationId,
    conversationsLoading,
    loadConversations,
    searchConversations,
    selectConversation,
    createConversation,
    deleteConversation,
  } = useChatStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // 搜索 debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      searchConversations(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchConversations]);

  const handleDelete = useCallback(
    async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (deleteConfirmId === id) {
        await deleteConversation(id);
        setDeleteConfirmId(null);
      } else {
        setDeleteConfirmId(id);
        // 3 秒后自动取消确认状态
        setTimeout(() => setDeleteConfirmId(null), 3000);
      }
    },
    [deleteConfirmId, deleteConversation]
  );

  return (
    <div className="flex flex-col h-full">
      {/* 新建对话 */}
      <div className="p-3">
        <button
          onClick={createConversation}
          className="w-full py-2.5 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          新建对话
        </button>
      </div>

      {/* 搜索框 */}
      <div className="px-3 pb-3">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜索会话..."
          className="w-full px-3 py-2 bg-gray-100 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400"
        />
      </div>

      {/* 会话列表 */}
      <div className="flex-1 overflow-y-auto">
        {conversationsLoading && conversations.length === 0 ? (
          <div className="p-4 flex items-center justify-center gap-2 text-gray-400">
            <Spinner className="w-4 h-4" />
            <span className="text-sm">加载中...</span>
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-4 text-center text-gray-400 text-sm">暂无会话</div>
        ) : (
          <div className="space-y-0.5 px-2">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => selectConversation(conv.id)}
                className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                  currentConversationId === conv.id
                    ? 'bg-blue-50 text-blue-700'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <svg className="w-4 h-4 shrink-0 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                <span className="flex-1 truncate text-sm">{conv.title || '新对话'}</span>
                <button
                  onClick={(e) => handleDelete(conv.id, e)}
                  className={`shrink-0 p-1 rounded transition-colors text-xs ${
                    deleteConfirmId === conv.id
                      ? 'text-red-600 bg-red-50'
                      : 'text-gray-400 opacity-0 group-hover:opacity-100 hover:text-red-500'
                  }`}
                  title={deleteConfirmId === conv.id ? '确认删除' : '删除'}
                >
                  {deleteConfirmId === conv.id ? '确认?' : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 底部用户信息面板 */}
      <UserMenu />
    </div>
  );
}
