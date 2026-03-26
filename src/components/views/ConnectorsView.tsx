'use client';

export function ConnectorsView() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-4">
      <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-600 mb-2">连接器</h2>
        <p className="text-sm text-gray-400">管理和配置外部服务连接，功能即将上线</p>
      </div>
    </div>
  );
}
