'use client';

import { useChatStore } from '@/stores/chat';
import { FileList } from './FileList';
import { useLanguage } from '@/lib/i18n/context';

export function ArtifactPanel() {
  const {
    artifactPanelOpen,
    setArtifactPanelOpen,
  } = useChatStore();
  const { t } = useLanguage();

  return (
    <>
      {/* 移动端遮罩 */}
      {artifactPanelOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
          onClick={() => setArtifactPanelOpen(false)}
        />
      )}

      {/* 面板 */}
      <aside 
        className={`fixed md:relative inset-y-0 right-0 z-50 md:z-0 bg-white border-l border-gray-200 flex flex-col transition-all duration-300 ease-in-out flex-shrink-0
          ${artifactPanelOpen ? 'translate-x-0 w-80 md:w-96' : 'translate-x-full md:translate-x-0 w-0 md:w-0 border-l-0 overflow-hidden'}
        `}
      >
        <div className="w-80 md:w-96 flex flex-col h-full">
          {/* 顶部标题栏 */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 flex-shrink-0">
            <span className="text-sm font-medium text-gray-700">{t.chat.workspace.title}</span>
            <button
              onClick={() => setArtifactPanelOpen(false)}
              className="p-2 -mr-2 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 rounded-lg hover:bg-gray-100"
              title={t.chat.workspace.close}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                <line x1="15" x2="15" y1="3" y2="21"/>
                <path d="m10 15 3-3-3-3"/>
              </svg>
            </button>
          </div>

          {/* 内容区域 */}
          <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-gray-50">
            <FileList />
          </div>
        </div>
      </aside>
    </>
  );
}
