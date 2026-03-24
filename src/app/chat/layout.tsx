'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useChatStore } from '@/stores/chat';
import { ConversationList } from '@/components/chat/ConversationList';
import { useLanguage } from '@/lib/i18n/context';

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { t } = useLanguage();
  const { 
    currentConversationId, 
    sidebarOpen, 
    toggleSidebar, 
    setSidebarOpen,
    desktopSidebarOpen,
    toggleDesktopSidebar,
    setDesktopSidebarOpen
  } = useChatStore();

  // Sync store with route (Store updates -> URL changes)
  // This ensures that when a new conversation is created via streaming,
  // the URL updates from /chat to /chat/[id]
  useEffect(() => {
    const currentPath = window.location.pathname;
    if (currentConversationId) {
      const match = currentPath.match(/^\/chat\/([^/]+)$/);
      if (!match || match[1] !== currentConversationId) {
        router.replace(`/chat/${currentConversationId}`);
      }
    }
  }, [currentConversationId, router]);

  // Load and save desktop sidebar preference
  useEffect(() => {
    const savedState = localStorage.getItem('liteflow_desktop_sidebar');
    if (savedState !== null) {
      setDesktopSidebarOpen(savedState === 'true');
    }
  }, [setDesktopSidebarOpen]);

  useEffect(() => {
    localStorage.setItem('liteflow_desktop_sidebar', String(desktopSidebarOpen));
  }, [desktopSidebarOpen]);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* 移动端遮罩 */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-20 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* 侧边栏 */}
      <aside
        className={`fixed md:relative inset-y-0 left-0 z-30 bg-white border-r border-gray-200 transition-all duration-300 ease-in-out flex-shrink-0
          ${sidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full w-72'} 
          ${desktopSidebarOpen ? 'md:translate-x-0 md:w-72' : 'md:translate-x-0 md:w-16'}
        `}
      >
        <div className="h-full overflow-hidden flex flex-col">
          <ConversationList />
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 flex flex-col min-w-0 relative h-full">
        {/* 顶部栏（移动端汉堡菜单） */}
        <header className="flex items-center px-4 py-3 border-b border-gray-200 bg-white md:hidden">
          <button onClick={toggleSidebar} className="p-1 text-gray-600 hover:text-gray-900">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="ml-3 text-lg font-semibold text-gray-900">LiteFlow</h1>
        </header>

        {children}
      </main>
    </div>
  );
}
