'use client';

import React from 'react';
import { useChatStore } from '@/stores/chat';
import type { FileItem, Artifact } from '@/lib/types';
import { useLanguage } from '@/lib/i18n/context';
import { translations } from '@/lib/i18n/translations';
import { downloadFileWithAuth, fetchFileContent, fetchFileBlobUrl } from '@/lib/fileUtils';
import { toast } from '@/components/ui/Toast';
import { md } from '@/lib/markdown';
import mermaid from 'mermaid';

export function GlobalFilePreviewModal() {
  const { previewFile, setPreviewFile, artifacts, currentConversationId } = useChatStore();
  const { t } = useLanguage();

  if (!previewFile) return null;

  const handleDownload = async () => {
    // 优先用 artifact 内存内容
    if (previewFile.artifactId) {
      const artifact = artifacts.find(a => a.id === previewFile.artifactId);
      if (artifact?.content) {
        const blob = new Blob([artifact.content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = previewFile.name;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }
    }

    // 从后端下载（带认证）
    const filePath = previewFile.path || previewFile.name;
    if (currentConversationId && filePath) {
      try {
        await downloadFileWithAuth(currentConversationId, filePath, previewFile.name);
      } catch {
        toast.error('Download failed');
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
              className="px-4 py-2 text-sm font-medium bg-teal-50 text-teal-600 hover:bg-teal-100 rounded-lg transition-colors flex items-center gap-2"
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
          <FilePreviewContent file={previewFile} artifacts={artifacts} conversationId={currentConversationId} t={t} />
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

function FilePreviewContent({ file, artifacts, conversationId, t }: { file: FileItem; artifacts: Artifact[]; conversationId: string | null; t: typeof translations.en }) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (file.type === 'MARKDOWN' && file.artifactId && containerRef.current) {
      mermaid.run({
        querySelector: '.mermaid',
        nodes: containerRef.current.querySelectorAll('.mermaid'),
      }).catch(err => console.error('Mermaid render error', err));
    }
  }, [file.type, file.artifactId]);

  // 优先用 artifact 内存内容
  if (file.artifactId) {
    const artifact = artifacts.find(a => a.id === file.artifactId);
    if (artifact?.content) {
      if (file.type === 'MARKDOWN') {
        return (
          <div className="p-6 h-full overflow-auto bg-white" ref={containerRef}>
            <div 
              className="prose prose-slate max-w-none mx-auto markdown-body"
              dangerouslySetInnerHTML={{ __html: md.render(artifact.content) }}
            />
          </div>
        );
      }

      if (file.type === 'CODE' || file.type === 'DATA') {
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

      if ((file.type === 'SVG' || file.type === 'IMAGE') && artifact.content?.trim().startsWith('<svg')) {
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

  // 从后端获取文件内容预览
  const filePath = file.path || file.name;
  if (conversationId && filePath) {
    // 图片预览
    if (file.type === 'IMAGE' || file.name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
      return <RemoteBlobPreview conversationId={conversationId} filePath={filePath} fileName={file.name} type="image" t={t} />;
    }

    // PDF 预览
    if (file.name.match(/\.pdf$/i)) {
      return <RemoteBlobPreview conversationId={conversationId} filePath={filePath} fileName={file.name} type="pdf" t={t} />;
    }

    // 文本类文件预览
    if (file.name.match(/\.(txt|md|json|csv|xml|yaml|yml|log|js|ts|tsx|jsx|py|java|go|rs|c|cpp|h|css|html|sql|sh|bat)$/i)) {
      const isMarkdown = file.type === 'MARKDOWN' || file.name.toLowerCase().endsWith('.md');
      return <RemoteTextPreview conversationId={conversationId} filePath={filePath} isMarkdown={isMarkdown} t={t} />;
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

// 远程二进制文件预览（图片/PDF）
function RemoteBlobPreview({ conversationId, filePath, fileName, type, t }: {
  conversationId: string; filePath: string; fileName: string; type: 'image' | 'pdf'; t: typeof translations.en;
}) {
  const [blobUrl, setBlobUrl] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    fetchFileBlobUrl(conversationId, filePath)
      .then(url => {
        setBlobUrl(url);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });

    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, filePath]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-full text-gray-400">{t.common.loading}</div>;
  }

  if (error || !blobUrl) {
    return (
      <div className="flex flex-col items-center justify-center min-h-full text-gray-500 gap-4">
        <span className="text-7xl opacity-50">{getFileIcon('FILE')}</span>
        <p className="text-lg">{t.chat.workspace.previewNotSupported}</p>
        <p className="text-sm text-gray-400">{t.chat.workspace.downloadToView}</p>
      </div>
    );
  }

  if (type === 'image') {
    return (
      <div className="flex items-center justify-center min-h-full p-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={blobUrl} alt={fileName} className="max-w-full max-h-full object-contain rounded-lg shadow-sm border border-gray-200/50 bg-white" />
      </div>
    );
  }

  // PDF
  return (
    <div className="p-6 h-full">
      <iframe src={blobUrl} className="w-full h-full border-none bg-white rounded-xl shadow-sm" title={fileName} />
    </div>
  );
}

// 远程文本文件预览
function RemoteTextPreview({ conversationId, filePath, isMarkdown, t }: {
  conversationId: string; filePath: string; isMarkdown?: boolean; t: typeof translations.en;
}) {
  const [content, setContent] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    fetchFileContent(conversationId, filePath)
      .then(text => {
        setContent(text);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [conversationId, filePath]);

  React.useEffect(() => {
    if (isMarkdown && content && containerRef.current) {
      mermaid.run({
        querySelector: '.mermaid',
        nodes: containerRef.current.querySelectorAll('.mermaid'),
      }).catch(err => console.error('Mermaid render error', err));
    }
  }, [content, isMarkdown]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-full text-gray-400">{t.common.loading}</div>;
  }

  if (error || content === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-full text-gray-500 gap-4">
        <span className="text-7xl opacity-50">{getFileIcon('CODE')}</span>
        <p className="text-lg">{t.chat.workspace.previewNotSupported}</p>
        <p className="text-sm text-gray-400">{t.chat.workspace.downloadToView}</p>
      </div>
    );
  }

  if (isMarkdown) {
    return (
      <div className="p-6 h-full overflow-auto bg-white" ref={containerRef}>
        <div 
          className="prose prose-slate max-w-none mx-auto markdown-body"
          dangerouslySetInnerHTML={{ __html: md.render(content) }}
        />
      </div>
    );
  }

  return (
    <div className="p-6 h-full">
      <pre className="h-full p-6 bg-white rounded-xl shadow-sm border border-gray-200 overflow-auto text-sm font-mono text-gray-800 m-0">
        <code>{content}</code>
      </pre>
    </div>
  );
}
