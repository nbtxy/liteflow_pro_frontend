'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useChatStore } from '@/stores/chat';
import { MessageContent } from './MessageContent';
import { ToolCallCard } from './ToolCallCard';
import { apiFetch } from '@/lib/api';
import { toast } from '@/components/ui/Toast';
import { Spinner } from '@/components/ui/Spinner';

export function MessageList() {
  const {
    messages,
    messagesLoading,
    isStreaming,
    stopGeneration,
    regenerateLastMessage,
    artifacts,
    selectArtifact,
    setArtifactPanelOpen,
  } = useChatStore();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [userScrolled, setUserScrolled] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const { editAndResendMessage } = useChatStore();

  // 自动滚动
  useEffect(() => {
    if (!userScrolled) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, userScrolled]);

  // 检测用户是否手动上滚
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    setUserScrolled(!isAtBottom);
  }, []);

  // 新消息发出时重置滚动状态
  const [prevMessagesLength, setPrevMessagesLength] = useState(messages.length);
  if (messages.length > prevMessagesLength) {
    setPrevMessagesLength(messages.length);
    if (userScrolled) {
      setUserScrolled(false);
    }
  } else if (messages.length < prevMessagesLength) {
    setPrevMessagesLength(messages.length);
  }

  const [feedbackState, setFeedbackState] = useState<{
    messageId: string;
    type: 'up' | 'down' | null;
    showModal: boolean;
  }>({ messageId: '', type: null, showModal: false });

  const [feedbackReason, setFeedbackReason] = useState('');

  const handleFeedback = useCallback(async (messageId: string, type: 'up' | 'down') => {
    if (type === 'down') {
      setFeedbackState({ messageId, type, showModal: true });
      return;
    }

    try {
      await apiFetch(`/api/messages/${messageId}/feedback`, {
        method: 'POST',
        body: JSON.stringify({ rating: type }),
      });
      setFeedbackState({ messageId, type: 'up', showModal: false });
      toast.success('感谢您的反馈');
    } catch {
      toast.error('反馈提交失败');
    }
  }, []);

  const submitDislikeFeedback = useCallback(async () => {
    if (!feedbackState.messageId) return;
    try {
      await apiFetch(`/api/messages/${feedbackState.messageId}/feedback`, {
        method: 'POST',
        body: JSON.stringify({ rating: 'down', comment: feedbackReason }),
      });
      setFeedbackState((prev) => ({ ...prev, showModal: false }));
      setFeedbackReason('');
      toast.success('感谢您的反馈');
    } catch {
      toast.error('反馈提交失败');
    }
  }, [feedbackState.messageId, feedbackReason]);

  // 点击 artifact 引用
  const handleArtifactClick = useCallback((artifactId: string) => {
    selectArtifact(artifactId);
    setArtifactPanelOpen(true);
  }, [selectArtifact, setArtifactPanelOpen]);

  if (messagesLoading) {
    return (
      <div className="flex-1 flex items-center justify-center gap-2 text-gray-400">
        <Spinner className="w-5 h-5" />
        <span className="text-sm">加载中...</span>
      </div>
    );
  }

  return (
    <div ref={containerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 py-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {messages.map((msg, idx) => {
          const isLast = idx === messages.length - 1;
          const isAssistant = msg.role === 'assistant';
          const isStreamingThis = isLast && isAssistant && isStreaming;

          return (
            <div key={msg.id} className={`flex ${isAssistant ? 'justify-start' : 'justify-end'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
              <div
                className={`relative group max-w-[85%] ${
                  isAssistant
                    ? 'px-2 pb-8 text-gray-800'
                    : 'rounded-2xl px-4 py-3 bg-teal-600 text-white'
                }`}
              >
                {/* 用户消息附件展示 */}
                {!isAssistant && msg.attachments && msg.attachments.length > 0 && (
                  <div className="mb-2 space-y-1">
                    {msg.attachments.map(att => (
                      <div key={att.id} className="flex items-center gap-2 text-xs bg-teal-500/30 rounded px-2 py-1">
                        <span>📎</span>
                        <span className="truncate">{att.name}</span>
                        <span className="text-teal-200">{formatSize(att.size)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {isAssistant ? (
                  <>
                    {/* 工具调用卡片 */}
                    {msg.toolCalls && msg.toolCalls.length > 0 && (
                      <div className="mb-2">
                        {msg.toolCalls.map(tc => (
                          <ToolCallCard key={tc.toolUseId} toolCall={tc} />
                        ))}
                      </div>
                    )}

                    {/* 消息内容 */}
                    {msg.content && (
                      <MessageContent content={msg.content} isStreaming={isStreamingThis} />
                    )}

                    {/* Artifact 引用标签 */}
                    {!isStreaming && artifacts.length > 0 && msg.content && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {artifacts
                          .filter(a => msg.content.includes(a.title))
                          .map(a => (
                            <button
                              key={a.id}
                              onClick={() => handleArtifactClick(a.id)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-teal-50 text-teal-600 rounded hover:bg-teal-100 transition-colors"
                            >
                              {a.title}
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </button>
                          ))
                        }
                      </div>
                    )}
                  </>
                ) : (
                  <div className="relative group">
                    {editingMessageId === msg.id ? (
                      <div className="flex flex-col gap-2 min-w-[200px] sm:min-w-[300px]">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full bg-teal-700 text-white border border-teal-500 rounded p-2 text-sm outline-none resize-none"
                          rows={Math.max(3, editContent.split('\n').length)}
                          autoFocus
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setEditingMessageId(null)}
                            className="px-3 py-1 text-xs bg-teal-500 hover:bg-teal-400 rounded transition-colors"
                          >
                            取消
                          </button>
                          <button
                            onClick={() => {
                              if (editContent.trim() && editContent !== msg.content) {
                                editAndResendMessage(msg.id, editContent.trim());
                              }
                              setEditingMessageId(null);
                            }}
                            className="px-3 py-1 text-xs bg-white text-teal-600 hover:bg-gray-100 rounded transition-colors"
                          >
                            发送
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
                        {!isStreaming && (
                          <button
                            onClick={() => {
                              setEditingMessageId(msg.id);
                              setEditContent(msg.content);
                            }}
                            className="absolute -left-12 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="编辑"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Assistant 消息操作栏 */}
                {isAssistant && !isStreaming && msg.content && (
                  <div className={`absolute left-1 flex items-center gap-2 ${isLast ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                    <button
                      onClick={() => handleFeedback(msg.id, 'up')}
                      className={`p-1 transition-colors ${
                        feedbackState.messageId === msg.id && feedbackState.type === 'up'
                          ? 'text-green-500'
                          : 'text-gray-400 hover:text-green-500'
                      }`}
                      title="有帮助"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleFeedback(msg.id, 'down')}
                      className={`p-1 transition-colors ${
                        feedbackState.messageId === msg.id && feedbackState.type === 'down'
                          ? 'text-red-500'
                          : 'text-gray-400 hover:text-red-500'
                      }`}
                      title="没帮助"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                      </svg>
                    </button>
                    <button
                      onClick={() => navigator.clipboard.writeText(msg.content)}
                      className="p-1 text-gray-400 hover:text-teal-500 transition-colors"
                      title="复制"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                    {isLast && (
                      <button
                        onClick={regenerateLastMessage}
                        className="p-1 text-gray-400 hover:text-teal-500 transition-colors"
                        title="重新生成"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* 流式输出时显示停止按钮 */}
        {isStreaming && (
          <div className="flex justify-center">
            <button
              onClick={stopGeneration}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-sm font-medium transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
              停止生成
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 负面反馈弹窗 */}
      {feedbackState.showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">告诉我们哪里可以改进</h3>
            <textarea
              value={feedbackReason}
              onChange={(e) => setFeedbackReason(e.target.value)}
              placeholder="请输入反馈原因（可选）..."
              className="w-full h-32 p-3 text-sm border border-gray-200 rounded-lg focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none resize-none"
            />
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setFeedbackState((prev) => ({ ...prev, showModal: false }));
                  setFeedbackReason('');
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={submitDislikeFeedback}
                className="px-4 py-2 text-sm text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors"
              >
                提交
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
