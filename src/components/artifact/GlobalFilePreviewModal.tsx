'use client';

import { useChatStore } from '@/stores/chat';
import type { FileItem, Artifact } from '@/lib/types';
import { useLanguage } from '@/lib/i18n/context';
import { translations } from '@/lib/i18n/translations';

export function GlobalFilePreviewModal() {
  const { previewFile, setPreviewFile, artifacts } = useChatStore();
  const { t } = useLanguage();

  if (!previewFile) return null;

  const handleDownload = () => {
    if (previewFile.url) {
      const a = document.createElement('a');
      a.href = previewFile.url;
      a.download = previewFile.name;
      a.click();
    } else if (previewFile.artifactId) {
      const artifact = artifacts.find(a => a.id === previewFile.artifactId);
      if (artifact?.content) {
        const blob = new Blob([artifact.content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = previewFile.name;
        a.click();
        URL.revokeObjectURL(url);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-all" onClick={() => setPreviewFile(null)}>
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-2xl">{getFileIcon(previewFile.type)}</span>
            <h3 className="text-lg font-semibold text-gray-900 truncate">{previewFile.name}</h3>
            {previewFile.version && (
              <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-md font-medium">v{previewFile.version}</span>
            )}
          </div>
          <div className="flex items-center gap-3 flex-shrink-0 ml-4">
            <button
              onClick={handleDownload}
              className="px-4 py-2 text-sm font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {t.chat.workspace.download}
            </button>
            <div className="w-px h-6 bg-gray-200 mx-1"></div>
            <button
              onClick={() => setPreviewFile(null)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title={t.chat.workspace.closePreview}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-auto bg-gray-50/50 relative">
          <FilePreviewContent file={previewFile} artifacts={artifacts} t={t} />
        </div>
      </div>
    </div>
  );
}

function getFileIcon(type: string): string {
  switch (type) {
    case 'CODE': return '📄';
    case 'HTML': return '🌐';
    case 'IMAGE': return '🖼️';
    case 'DATA': return '📊';
    case 'MARKDOWN': return '📝';
    case 'SVG': return '🎨';
    default: return '📎';
  }
}

function FilePreviewContent({ file, artifacts, t }: { file: FileItem; artifacts: Artifact[]; t: typeof translations.en }) {
  if (file.url) {
    if (file.type === 'IMAGE' || file.name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
      return (
        <div className="flex items-center justify-center min-h-full p-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={file.url} alt={file.name} className="max-w-full max-h-full object-contain rounded-lg shadow-sm border border-gray-200/50 bg-white" />
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center min-h-full text-gray-500 gap-4">
        <span className="text-7xl opacity-50">{getFileIcon(file.type)}</span>
        <p className="text-lg">{t.chat.workspace.previewNotSupported}</p>
        <p className="text-sm text-gray-400">{t.chat.workspace.downloadToView}</p>
      </div>
    );
  }

  if (file.artifactId) {
    const artifact = artifacts.find(a => a.id === file.artifactId);
    if (!artifact) return <div className="text-center text-gray-500 py-12">{t.chat.workspace.contentLost}</div>;

    if (file.type === 'CODE' || file.type === 'MARKDOWN') {
      return (
        <div className="p-6 h-full">
          <pre className="h-full p-6 bg-white rounded-xl shadow-sm border border-gray-200 overflow-auto text-sm font-mono text-gray-800 m-0">
            <code>{artifact.content}</code>
          </pre>
        </div>
      );
    }

    if (file.type === 'HTML') {
      return (
        <div className="p-6 h-full">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-full overflow-hidden">
            <iframe
              srcDoc={artifact.content || ''}
              sandbox="allow-scripts"
              className="w-full h-full border-none bg-white"
              title={artifact.title}
            />
          </div>
        </div>
      );
    }

    if (file.type === 'SVG' || file.type === 'IMAGE') {
      if (artifact.content?.trim().startsWith('<svg')) {
        return (
          <div className="flex items-center justify-center min-h-full p-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 max-w-full max-h-full flex items-center justify-center overflow-auto">
              <div dangerouslySetInnerHTML={{ __html: artifact.content }} className="max-w-full max-h-full" />
            </div>
          </div>
        );
      }
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-full text-gray-500 gap-4">
      <span className="text-7xl opacity-50">{getFileIcon(file.type)}</span>
      <p className="text-lg">{t.chat.workspace.previewNotSupported}</p>
      <p className="text-sm text-gray-400">{t.chat.workspace.downloadToView}</p>
    </div>
  );
}
