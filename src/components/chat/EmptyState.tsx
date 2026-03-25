'use client';

const SUGGESTIONS = [
  '写一段 Python 快排代码',
  '解释一下 CAP 定理',
  '帮我做个 PPT 大纲',
  '搜索最新 AI 新闻',
];

export function EmptyState() {
  const handleClick = (text: string) => {
    const fn = (window as unknown as Record<string, unknown>).__chatFillAndSend;
    if (typeof fn === 'function') {
      (fn as (text: string) => void)(text);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">LiteFlow Assistant</h2>
        <p className="text-gray-500 mb-8">有什么可以帮你的？</p>
        <div className="grid grid-cols-2 gap-3">
          {SUGGESTIONS.map((text) => (
            <button
              key={text}
              onClick={() => handleClick(text)}
              className="p-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-sm text-gray-700 text-left transition-colors"
            >
              {text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
