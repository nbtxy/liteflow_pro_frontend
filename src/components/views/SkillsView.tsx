'use client';

export function SkillsView() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-4">
      <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-600 mb-2">技能市场</h2>
        <p className="text-sm text-gray-400">浏览和安装各类 AI 技能，功能即将上线</p>
      </div>
    </div>
  );
}
