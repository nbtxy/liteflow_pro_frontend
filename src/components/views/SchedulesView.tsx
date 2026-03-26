'use client';

export function SchedulesView() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-4">
      <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-600 mb-2">定时任务</h2>
        <p className="text-sm text-gray-400">创建和管理定时执行的自动化任务，功能即将上线</p>
      </div>
    </div>
  );
}
