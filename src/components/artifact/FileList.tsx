'use client';

import { useChatStore } from '@/stores/chat';
import type { FileItem } from '@/lib/types';
import { artifactToFileItem } from '@/lib/types';
import { useLanguage } from '@/lib/i18n/context';

export function FileList() {
  const { files, artifacts, selectedArtifactId, selectArtifact, setPreviewFile, removeFile, removeArtifact } = useChatStore();
  const { t } = useLanguage();

  // Combine artifacts into file-like items
  const allFiles: FileItem[] = [...artifacts.map(artifactToFileItem), ...files];

  if (allFiles.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        {t.chat.workspace.noFiles}
      </div>
    );
  }

  const handleFileClick = (file: FileItem) => {
    // Treat clicking a file same as clicking download for now,
    // or we can select it (but we don't have the artifact preview anymore)
    if (file.artifactId) {
      selectArtifact(file.artifactId);
    }
    handleDownload(file);
  };

  const handlePreview = (file: FileItem) => {
    setPreviewFile(file);
  };

  const handleDownload = (file: FileItem) => {
    if (file.url) {
      const a = document.createElement('a');
      a.href = file.url;
      a.download = file.name;
      a.click();
    } else if (file.artifactId) {
      const artifact = artifacts.find(a => a.id === file.artifactId);
      if (artifact?.content) {
        const blob = new Blob([artifact.content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
      }
    }
  };

  const handleDelete = (file: FileItem, idx: number) => {
    if (file.artifactId) {
      removeArtifact(file.artifactId);
    } else {
      // idx offset by artifacts count since allFiles = [...artifacts, ...files]
      const fileIdx = idx - artifacts.length;
      if (fileIdx >= 0) {
        removeFile(fileIdx);
      }
    }
  };

  return (
    <div className="flex-1 overflow-auto p-3 space-y-1">
      {allFiles.map((file, idx) => (
        <div
          key={file.artifactId || `file-${idx}`}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors group ${
            file.artifactId === selectedArtifactId ? 'bg-blue-50' : 'hover:bg-gray-100'
          }`}
        >
          <span className="text-base flex-shrink-0">{getFileIcon(file.type)}</span>
          <div
            className="flex-1 min-w-0 cursor-pointer"
            onClick={() => handleFileClick(file)}
          >
            <div className="text-sm text-gray-700 truncate">{file.name}</div>
            <div className="text-xs text-gray-400">
              {formatFileSize(file.size)}
              {file.version && ` · v${file.version}`}
              {file.source === 'upload' && ` · ${t.chat.workspace.uploaded}`}
            </div>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
            <button
              onClick={(e) => { e.stopPropagation(); handlePreview(file); }}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-md transition-colors"
              title={t.chat.workspace.preview}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleDownload(file); }}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-md transition-colors"
              title={t.chat.workspace.download}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleDelete(file, idx); }}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
              title={t.common.delete}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      ))}
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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
