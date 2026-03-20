'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { useChatStore } from '@/stores/chat';
import { ConversationList } from '@/components/chat/ConversationList';
import { MessageList } from '@/components/chat/MessageList';
import { ChatInput } from '@/components/chat/ChatInput';
import { EmptyState } from '@/components/chat/EmptyState';

export default function ChatPage() {
  const router = useRouter();
  const { messages, currentConversationId, sidebarOpen, toggleSidebar, setSidebarOpen } = useChatStore();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
    }
  }, [router]);

  const showEmptyState = !currentConversationId && messages.length === 0;

  return (
    <div className="flex h-screen bg-gray-50">
      {/* 移动端遮罩 */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-20 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* 侧边栏 */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-30 w-72 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <ConversationList />
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* 顶部栏（移动端汉堡菜单） */}
        <header className="flex items-center px-4 py-3 border-b border-gray-200 bg-white md:hidden">
          <button onClick={toggleSidebar} className="p-1 text-gray-600 hover:text-gray-900">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="ml-3 text-lg font-semibold text-gray-900">LiteFlow</h1>
        </header>

        {/* 消息区 */}
        {showEmptyState ? <EmptyState /> : <MessageList />}

        {/* 输入框 */}
        <ChatInput />
      </main>
    </div>
  );
}
