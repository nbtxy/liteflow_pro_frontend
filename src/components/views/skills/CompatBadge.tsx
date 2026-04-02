import React from 'react';

const COMPAT_CONFIG = {
  FULL: { label: '完全兼容', color: 'text-green-700 bg-green-50', icon: '✅' },
  PARTIAL: { label: '部分兼容', color: 'text-yellow-700 bg-yellow-50', icon: '⚠️' },
  INCOMPATIBLE: { label: '不兼容', color: 'text-red-700 bg-red-50', icon: '❌' },
};

export function CompatBadge({ level, score }: { level: string; score?: number }) {
  const config = COMPAT_CONFIG[level as keyof typeof COMPAT_CONFIG] ?? COMPAT_CONFIG.INCOMPATIBLE;
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded ${config.color}`} title={score !== undefined ? `得分: ${score}` : undefined}>
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
}
