'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useChatStore } from '@/stores/chat';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Spinner } from '@/components/ui/Spinner';
import { UserMenu } from './UserMenu';
import { useLanguage } from '@/lib/i18n/context';

export function ConversationList() {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLanguage();
  const {
    conversations,
    currentConversationId,
    conversationsLoading,
    loadConversations,
    searchConversations,
    createConversation,
    deleteConversation,
    renameConversation,
    archiveConversation,
    unarchiveConversation,
    archivedConversations,
    archivedLoading,
    loadArchivedConversations,
    desktopSidebarOpen,
    toggleDesktopSidebar,
  } = useChatStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [archivedOpen, setArchivedOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadConversations();
    loadArchivedConversations();
  }, [loadConversations, loadArchivedConversations]);

  // 搜索 debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      searchConversations(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchConversations]);

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
        setDeleteConfirmId(null);
      }
    };
    if (menuOpenId) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [menuOpenId]);

  // 重命名时自动 focus
  useEffect(() => {
    if (renameId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renameId]);

  const handleMenuToggle = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpenId((prev) => (prev === id ? null : id));
    setDeleteConfirmId(null);
  }, []);

  const handleRenameStart = useCallback((conv: { id: string; title: string }) => {
    setRenameId(conv.id);
    setRenameValue(conv.title || '');
    setMenuOpenId(null);
  }, []);

  const handleRenameSubmit = useCallback(async () => {
    if (renameId && renameValue.trim()) {
      await renameConversation(renameId, renameValue.trim());
    }
    setRenameId(null);
    setRenameValue('');
  }, [renameId, renameValue, renameConversation]);

  const handleRenameKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      setRenameId(null);
      setRenameValue('');
    }
  }, [handleRenameSubmit]);

  const handleArchive = useCallback(async (id: string) => {
    setMenuOpenId(null);
    await archiveConversation(id);
  }, [archiveConversation]);

  const handleDeleteRequest = useCallback((id: string) => {
    setMenuOpenId(null);
    setDeleteConfirmId(id);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (deleteConfirmId) {
      await deleteConversation(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  }, [deleteConfirmId, deleteConversation]);

  return (
    <div className="flex flex-col h-full">
      {/* 顶部标题和折叠按钮 */}
      <div className={`flex items-center ${desktopSidebarOpen ? 'justify-between px-4' : 'justify-center'} h-14 shrink-0`}>
        {desktopSidebarOpen && (
          <h1 className="text-lg font-semibold text-gray-900 truncate">LiteFlow</h1>
        )}
        <button
          onClick={toggleDesktopSidebar}
          className="p-2 rounded-lg text-gray-500 hover:text-gray-900 transition-colors hover:bg-gray-100"
          title={desktopSidebarOpen ? t.common.closeSidebar : t.common.openSidebar}
        >
          {desktopSidebarOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
              <line x1="9" x2="9" y1="3" y2="21"/>
              <path d="m16 15-3-3 3-3"/>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
              <line x1="9" x2="9" y1="3" y2="21"/>
              <path d="m14 9 3 3-3 3"/>
            </svg>
          )}
        </button>
      </div>

      {/* 新建对话 */}
      <div className="px-3 pb-3">
        <button
          onClick={() => {
            createConversation();
            router.push('/chat');
          }}
          className={`w-full py-2.5 ${desktopSidebarOpen ? 'px-4' : 'px-0'} bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors flex items-center justify-center gap-2`}
          title={!desktopSidebarOpen ? t.chat.newChat : undefined}
        >
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {desktopSidebarOpen && <span className="whitespace-nowrap">{t.chat.newChat}</span>}
        </button>
      </div>

      {/* 功能入口 */}
      {desktopSidebarOpen ? (
        <div className="px-3 pb-3 grid grid-cols-4 gap-1.5">
          {([
            { path: '/chat/im', label: 'IM', title: 'IM 消息', icon: 'M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4' },
            { path: '/chat/connectors', label: '连接器', title: '连接器', icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1' },
            { path: '/chat/skills', label: '技能', title: '技能市场', icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z' },
            { path: '/chat/schedules', label: '定时', title: '定时任务', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
          ]).map(item => (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={`flex flex-col items-center gap-1 py-2 rounded-lg transition-colors ${
                pathname === item.path
                  ? 'bg-teal-50 text-teal-600'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-teal-600'
              }`}
              title={item.title}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
              </svg>
              <span className="text-[10px] leading-tight">{item.label}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="px-1.5 pb-2 space-y-1">
          {([
            { path: '/chat/im', title: 'IM 消息', icon: 'M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4' },
            { path: '/chat/connectors', title: '连接器', icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1' },
            { path: '/chat/skills', title: '技能市场', icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z' },
            { path: '/chat/schedules', title: '定时任务', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
          ]).map(item => (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={`w-full p-2 rounded-lg transition-colors flex items-center justify-center ${
                pathname === item.path
                  ? 'bg-teal-50 text-teal-600'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-teal-600'
              }`}
              title={item.title}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
              </svg>
            </button>
          ))}
        </div>
      )}

      {/* 搜索框 */}
      {desktopSidebarOpen && (
        <div className="px-3 pb-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.chat.searchPlaceholder}
            className="w-full px-3 py-2 bg-gray-100 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500 text-gray-900 placeholder-gray-400"
          />
        </div>
      )}

      {/* 会话列表 */}
      <div className="flex-1 overflow-y-auto">
        {desktopSidebarOpen && (
          conversationsLoading && conversations.length === 0 ? (
            <div className="p-4 flex items-center justify-center gap-2 text-gray-400">
              <Spinner className="w-4 h-4" />
              <span className="text-sm">{t.common.loading}</span>
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-400 text-sm">{t.chat.noConversations}</div>
          ) : (
            <div className="space-y-0.5 px-2">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => router.push(`/chat/${conv.id}`)}
                  className={`group relative flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                    pathname === `/chat/${conv.id}`
                      ? 'bg-teal-50 text-teal-700'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <svg className="w-4 h-4 shrink-0 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>

                  {/* 重命名输入框 */}
                  {renameId === conv.id ? (
                    <input
                      ref={renameInputRef}
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={handleRenameSubmit}
                      onKeyDown={handleRenameKeyDown}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 text-sm bg-white border border-teal-400 rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  ) : (
                    <span className="flex-1 truncate text-sm">{conv.title || t.chat.newChat}</span>
                  )}

                  {/* 更多操作按钮 */}
                  {renameId !== conv.id && (
                    <button
                      onClick={(e) => handleMenuToggle(conv.id, e)}
                      className={`shrink-0 p-1 rounded transition-colors ${
                        menuOpenId === conv.id
                          ? 'text-gray-700 bg-gray-200'
                          : 'text-gray-400 opacity-0 group-hover:opacity-100 hover:text-gray-700 hover:bg-gray-200'
                      }`}
                      title={t.chat.moreActions}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01" />
                      </svg>
                    </button>
                  )}

                  {/* 操作面板 */}
                  {menuOpenId === conv.id && (
                    <div
                      ref={menuRef}
                      className="absolute right-0 top-full mt-1 z-50 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => handleRenameStart(conv)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        {t.common.rename}
                      </button>
                      <button
                        onClick={() => handleArchive(conv.id)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                        </svg>
                        {t.common.archive}
                      </button>
                      <div className="border-t border-gray-100 my-1" />
                      <button
                        onClick={() => handleDeleteRequest(conv.id)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        {t.common.delete}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        )}

        {/* 已归档分组 */}
        {desktopSidebarOpen && archivedConversations.length > 0 && (
          <div className="px-2 mt-2">
            <button
              onClick={() => setArchivedOpen(!archivedOpen)}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg
                className={`w-3 h-3 transition-transform ${archivedOpen ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              <span>{t.chat.archivedChats}</span>
              <span className="text-gray-300">({archivedConversations.length})</span>
            </button>

            {archivedOpen && (
              <div className="space-y-0.5 mt-1">
                {archivedLoading ? (
                  <div className="p-2 flex items-center justify-center gap-2 text-gray-400">
                    <Spinner className="w-3 h-3" />
                  </div>
                ) : (
                  archivedConversations.map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => router.push(`/chat/${conv.id}`)}
                      className={`group relative flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                        pathname === `/chat/${conv.id}`
                          ? 'bg-teal-50 text-teal-700'
                          : 'hover:bg-gray-100 text-gray-400'
                      }`}
                    >
                      <svg className="w-4 h-4 shrink-0 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                      </svg>
                      <span className="flex-1 truncate text-sm">{conv.title || t.chat.newChat}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          unarchiveConversation(conv.id);
                        }}
                        className="shrink-0 p-1 rounded text-gray-400 opacity-0 group-hover:opacity-100 hover:text-teal-600 hover:bg-teal-50 transition-all"
                        title={t.common.unarchive}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                        </svg>
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteConfirmId}
        title={t.chat.confirmDeleteTitle}
        description={t.chat.confirmDeleteDesc}
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirmId(null)}
      />

      {/* 底部用户信息面板 */}
      <UserMenu isCollapsed={!desktopSidebarOpen} />
    </div>
  );
}
