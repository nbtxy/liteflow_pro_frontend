'use client';

import { useState } from 'react';
import type { ToolCall } from '@/lib/types';
import { TOOL_CONFIG } from '@/lib/types';

interface Props {
  toolCall: ToolCall;
}

export function ToolCallCard({ toolCall }: Props) {
  const [expanded, setExpanded] = useState(false);
  const config = TOOL_CONFIG[toolCall.toolName] || {
    icon: '🔧',
    runningText: () => `正在执行 ${toolCall.toolName}...`,
    doneText: '执行完成',
  };

  const isRunning = toolCall.status === 'running';
  const isError = toolCall.status === 'error';
  const statusIcon = isRunning ? (
    <span className="inline-block w-4 h-4 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
  ) : isError ? (
    <span className="text-red-500 text-sm">✕</span>
  ) : (
    <span className="text-green-500 text-sm">✓</span>
  );

  const displayText = isRunning
    ? config.runningText(toolCall.input)
    : config.doneText;

  const durationText = toolCall.duration
    ? `${(toolCall.duration / 1000).toFixed(1)}s`
    : '';

  return (
    <div
      className={`my-2 rounded-lg border transition-colors cursor-pointer ${
        isRunning
          ? 'border-teal-200 bg-teal-50/50'
          : isError
          ? 'border-red-200 bg-red-50/50'
          : 'border-gray-200 bg-gray-50/50'
      }`}
      onClick={() => setExpanded(!expanded)}
    >
      {/* 折叠态 */}
      <div className="flex items-center gap-2 px-3 py-2 text-sm">
        <span className="text-base flex-shrink-0">{config.icon}</span>
        <span className="flex-1 text-gray-700 truncate">{displayText}</span>
        {durationText && !isRunning && (
          <span className="text-xs text-gray-400 flex-shrink-0">{durationText}</span>
        )}
        <span className="flex-shrink-0">{statusIcon}</span>
        <svg
          className={`w-3 h-3 text-gray-400 transition-transform flex-shrink-0 ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* 展开态 */}
      {expanded && (
        <div className="px-3 pb-2 pt-1 border-t border-gray-100 text-xs text-gray-500 space-y-1">
          <div>
            <span className="font-medium text-gray-600">工具: </span>
            {toolCall.toolName}
          </div>
          {toolCall.input && (
            <div>
              <span className="font-medium text-gray-600">输入: </span>
              <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-700 break-all">
                {toolCall.input}
              </code>
            </div>
          )}
          <div>
            <span className="font-medium text-gray-600">状态: </span>
            {isRunning ? '执行中' : isError ? '失败' : '成功'}
            {durationText && ` (${durationText})`}
          </div>
        </div>
      )}
    </div>
  );
}
