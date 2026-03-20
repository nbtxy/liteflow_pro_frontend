'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useChatStore } from '@/stores/chat';

export function ChatInput() {
  const { sendMessage, isStreaming } = useChatStore();
  const [content, setContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 自动调整高度
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }, [content]);

  const handleSend = useCallback(() => {
    const trimmed = content.trim();
    if (!trimmed || isStreaming) return;
    setContent('');
    sendMessage(trimmed);
  }, [content, isStreaming, sendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  // 暴露填入内容的方法（供推荐问题使用）
  const fillAndSend = useCallback(
    (text: string) => {
      if (isStreaming) return;
      sendMessage(text);
    },
    [isStreaming, sendMessage]
  );

  // 将 fillAndSend 挂到 window 以便 EmptyState 调用
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__chatFillAndSend = fillAndSend;
    return () => {
      delete (window as unknown as Record<string, unknown>).__chatFillAndSend;
    };
  }, [fillAndSend]);

  return (
    <div className="px-4 pb-6 pt-2 w-full">
      <div className="max-w-3xl mx-auto">
        <div className="relative flex flex-col bg-white border border-gray-200 rounded-2xl shadow-sm focus-within:border-gray-300 focus-within:shadow-md transition-all duration-200">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="给 LiteFlow 发送消息..."
            rows={1}
            disabled={isStreaming}
            className="w-full max-h-[40vh] resize-none bg-transparent px-4 pt-4 pb-3 outline-none text-gray-900 placeholder-gray-400 text-[15px] leading-relaxed disabled:opacity-50 scrollbar-hide"
          />

          {/* 底部操作栏 */}
          <div className="flex justify-between items-center px-2 pb-2">
            {/* 左侧：附件按钮 (Mock) */}
            <button
              type="button"
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              title="上传文件"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>

            {/* 右侧：发送按钮 */}
            <button
              onClick={handleSend}
              disabled={isStreaming || !content.trim()}
              className={`p-2 rounded-xl flex items-center justify-center transition-all duration-200 ${
                !content.trim() || isStreaming
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
