'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useChatStore } from '@/stores/chat';
import { ConversationList } from '@/components/chat/ConversationList';
import { ArtifactPanel } from '@/components/artifact/ArtifactPanel';
import { GlobalFilePreviewModal } from '@/components/artifact/GlobalFilePreviewModal';
import { useLanguage } from '@/lib/i18n/context';
import { AuthGuard } from '@/components/auth/AuthGuard';

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
    setDesktopSidebarOpen,
    artifactPanelOpen,
    setArtifactPanelOpen,
  } = useChatStore();

  // Sync store with route (Store updates -> URL changes)
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
    <AuthGuard>
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
        {/* 桌面端右侧面板切换按钮（仅当面板关闭时显示） */}
        {!artifactPanelOpen && (
          <div className="hidden md:block absolute top-4 right-4 z-40">
            <button
              onClick={() => setArtifactPanelOpen(true)}
              className="p-2 rounded-lg text-gray-500 hover:text-gray-900 transition-colors bg-white border border-gray-200 shadow-sm hover:bg-gray-50"
              title={t.chat.workspace.open}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                <line x1="15" x2="15" y1="3" y2="21"/>
                <path d="m8 9-3 3 3 3"/>
              </svg>
            </button>
          </div>
        )}

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

      {/* Artifact 面板（右侧） */}
      <ArtifactPanel />

      {/* 全局文件预览弹窗 */}
      <GlobalFilePreviewModal />
    </div>
    </AuthGuard>
  );
}
