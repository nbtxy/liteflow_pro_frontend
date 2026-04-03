'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import OSS from 'ali-oss';
import { useChatStore } from '@/stores/chat';
import { toast } from '@/components/ui/Toast';
import { getAccessToken } from '@/lib/auth';
import { getApiUrl } from '@/lib/config';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const BLOCKED_EXTENSIONS = ['.exe', '.bat', '.cmd', '.com', '.msi', '.scr', '.pif'];

export function ChatInput() {
  const {
    sendMessage,
    isStreaming,
    currentConversationId,
    ensureConversation,
    pendingAttachments,
    addPendingAttachment,
    updatePendingAttachment,
    removePendingAttachment,
    setArtifactPanelOpen,
    loadFiles,
  } = useChatStore();
  const [content, setContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isComposing, setIsComposing] = useState(false);

  // 自动调整高度
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }, [content]);

  const handleSend = useCallback(() => {
    const trimmed = content.trim();
    const hasAttachments = pendingAttachments.some(a => a.status === 'done');
    if ((!trimmed && !hasAttachments) || isStreaming) return;
    setContent('');
    sendMessage(trimmed);
  }, [content, isStreaming, sendMessage, pendingAttachments]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        const native = e.nativeEvent as unknown as { isComposing?: boolean; keyCode?: number };
        const composing = isComposing || !!native?.isComposing || native?.keyCode === 229;
        if (composing) {
          return;
        }
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend, isComposing]
  );

  // 文件上传逻辑
  const uploadFile = useCallback(async (file: File) => {
    // 校验文件大小
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`文件 ${file.name} 超过 10MB 限制`);
      return;
    }

    // 校验文件类型
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (BLOCKED_EXTENSIONS.includes(ext)) {
      toast.error(`不支持上传 ${ext} 类型的文件`);
      return;
    }

    const attachmentId = `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const isImage = file.type.startsWith('image/');
    let dataUrl: string | undefined;

    if (isImage) {
      dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    }

    addPendingAttachment({
      id: attachmentId,
      name: file.name,
      size: file.size,
      status: 'uploading',
      progress: 0,
      url: dataUrl,
      type: isImage ? 'image' : 'file',
      mimeType: file.type,
    });

    try {
      let convId = currentConversationId;
      if (!convId) {
        try {
          convId = await ensureConversation();
        } catch {
          updatePendingAttachment(attachmentId, { status: 'error' });
          return;
        }
      }

      const convIdStr = String(convId);
      let token = getAccessToken();

      // 1. 获取 STS Token
      let stsToken: any = null;
      try {
        const url = `/api/oss/sts?conversationId=${convIdStr}`;
        let stsRes = await fetch(getApiUrl(url), {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        
        // Handle token expiration and refresh
        if (stsRes.status === 401) {
           const { refreshAccessToken } = await import('@/lib/auth');
           token = await refreshAccessToken();
           if (token) {
             stsRes = await fetch(getApiUrl(url), {
               headers: { Authorization: `Bearer ${token}` }
             });
           } else {
             throw new Error('Unauthorized');
           }
        }
        
        if (stsRes.ok) {
          const json = await stsRes.json();
          if (json.code === 200 && json.data?.accessKeyId) {
            stsToken = json.data;
          }
        }
      } catch (err) {
        console.warn('Failed to get STS token', err);
      }

      if (stsToken) {
        // 2a. 使用 OSS SDK 分片上传
        const { getOssClient } = await import('@/lib/fileUtils');
        const client = getOssClient(stsToken, convIdStr);

        const objectKey = `conversations/${convIdStr}/uploads/${file.name}`;

        try {
          await client.multipartUpload(objectKey, file, {
            progress: (p) => {
              const progress = Math.round(p * 100);
              updatePendingAttachment(attachmentId, { progress });
            }
          });

          // 3. 上传完成，回调后端确认
          await fetch(
            getApiUrl(`/api/conversations/${convIdStr}/files/confirm-upload?path=${encodeURIComponent('uploads/' + file.name)}&size=${file.size}`),
            { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {} }
          );
          
          updatePendingAttachment(attachmentId, { status: 'done', progress: 100 });
          toast.success(`${file.name} 上传成功`);
          setArtifactPanelOpen(true);
          loadFiles(convIdStr);
        } catch (uploadErr) {
          console.error('OSS upload error:', uploadErr);
          updatePendingAttachment(attachmentId, { status: 'error' });
          toast.error(`${file.name} 上传失败`);
        }
      } else {
        // 2b. 降级为通过后端代理上传 (本地存储模式)
        const xhr = new XMLHttpRequest();
        const formData = new FormData();
        formData.append('file', file);

        const url = getApiUrl(`/api/conversations/${convIdStr}/files`);
        xhr.open('POST', url);
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            updatePendingAttachment(attachmentId, { progress });
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            updatePendingAttachment(attachmentId, { status: 'done', progress: 100 });
            toast.success(`${file.name} 上传成功`);
            setArtifactPanelOpen(true);
            loadFiles(convIdStr);
          } else {
            updatePendingAttachment(attachmentId, { status: 'error' });
            toast.error(`${file.name} 上传失败`);
          }
        };

        xhr.onerror = () => {
          updatePendingAttachment(attachmentId, { status: 'error' });
          toast.error(`${file.name} 上传失败`);
        };

        xhr.send(formData);
      }
    } catch {
      updatePendingAttachment(attachmentId, { status: 'error' });
      toast.error(`${file.name} 上传失败`);
    }
  }, [currentConversationId, ensureConversation, addPendingAttachment, updatePendingAttachment, setArtifactPanelOpen, loadFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(uploadFile);
    // Reset input
    e.target.value = '';
  }, [uploadFile]);

  // 拖拽上传
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    Array.from(files).forEach(uploadFile);
  }, [uploadFile]);

  // 暴露填入内容的方法（供推荐问题使用）
  const fillAndSend = useCallback(
    (text: string) => {
      if (isStreaming) return;
      sendMessage(text);
    },
    [isStreaming, sendMessage]
  );

  useEffect(() => {
    (window as unknown as Record<string, unknown>).__chatFillAndSend = fillAndSend;
    return () => {
      delete (window as unknown as Record<string, unknown>).__chatFillAndSend;
    };
  }, [fillAndSend]);

  return (
    <div
      ref={dropZoneRef}
      className="px-4 pb-6 pt-2 w-full"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="max-w-3xl mx-auto">
        <div className={`relative flex flex-col bg-white border rounded-2xl shadow-sm focus-within:border-gray-300 focus-within:shadow-md transition-all duration-200 ${
          isDragging ? 'border-teal-400 bg-teal-50/30 shadow-md' : 'border-gray-200'
        }`}>
          {/* 拖拽提示 */}
          {isDragging && (
            <div className="absolute inset-0 flex items-center justify-center bg-teal-50/80 rounded-2xl z-10 pointer-events-none">
              <div className="text-teal-500 text-sm font-medium">释放文件以上传</div>
            </div>
          )}

          {/* 待上传文件列表 */}
          {pendingAttachments.length > 0 && (
            <div className="px-4 pt-3 flex flex-wrap gap-2">
              {pendingAttachments.map(att => (
                <div
                  key={att.id}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs border ${
                    att.status === 'error'
                      ? 'border-red-200 bg-red-50 text-red-600'
                      : att.status === 'done'
                      ? 'border-green-200 bg-green-50 text-green-700'
                      : 'border-gray-200 bg-gray-50 text-gray-600'
                  }`}
                >
                  <span>📎</span>
                  <span className="truncate max-w-[120px]">{att.name}</span>
                  <span className="text-gray-400">({formatSize(att.size)})</span>
                  {att.status === 'uploading' && (
                    <span className="text-teal-500">{att.progress}%</span>
                  )}
                  {att.status === 'done' && <span className="text-green-500">✓</span>}
                  {att.status === 'error' && <span className="text-red-500">✕</span>}
                  <button
                    onClick={() => removePendingAttachment(att.id)}
                    className="text-gray-400 hover:text-gray-600 ml-1"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
            placeholder="给 LiteFlow 发送消息..."
            rows={1}
            disabled={isStreaming}
            className="w-full max-h-[40vh] resize-none bg-transparent px-4 pt-4 pb-3 outline-none text-gray-900 placeholder-gray-400 text-[15px] leading-relaxed disabled:opacity-50 scrollbar-hide"
          />

          {/* 底部操作栏 */}
          <div className="flex justify-between items-center px-2 pb-2">
            {/* 左侧：附件按钮 */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              title="上传文件"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />

            {/* 右侧：发送按钮 */}
            <button
              onClick={handleSend}
              disabled={isStreaming || (!content.trim() && !pendingAttachments.some(a => a.status === 'done'))}
              className={`p-2 rounded-xl flex items-center justify-center transition-all duration-200 ${
                (!content.trim() && !pendingAttachments.some(a => a.status === 'done')) || isStreaming
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-black text-white shadow-sm hover:bg-gray-800'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19V5m0 0l-6 6m6-6l6 6" />
              </svg>
            </button>
          </div>
        </div>

        {/* 底部提示文案 */}
        <div className="mt-3 text-center">
          <span className="text-xs text-gray-400">
            AI 可能会犯错，请核实重要信息。
          </span>
        </div>
      </div>
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
