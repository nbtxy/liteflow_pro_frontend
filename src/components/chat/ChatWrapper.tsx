'use client';

import { useChatStore } from '@/stores/chat';
import { ArtifactPanel } from '@/components/artifact/ArtifactPanel';
import { GlobalFilePreviewModal } from '@/components/artifact/GlobalFilePreviewModal';
import { useLanguage } from '@/lib/i18n/context';

/**
 * 聊天页面专属的包装组件，包含右侧工作区面板和文件预览弹窗。
 * 仅在 /chat 和 /chat/[id] 页面使用。
 */
export function ChatWrapper({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();
  const { artifactPanelOpen, setArtifactPanelOpen } = useChatStore();

  return (
    <>
      {/* 主内容区 */}
      <main className="flex-1 flex flex-col min-w-0 relative h-full">
        {/* 桌面端右侧面板切换按钮 */}
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

        {children}
      </main>

      {/* Artifact 面板（右侧，与 main 同级） */}
      <ArtifactPanel />

      {/* 全局文件预览弹窗 */}
      <GlobalFilePreviewModal />
    </>
  );
}
