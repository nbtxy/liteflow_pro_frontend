/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function OAuthCallbackPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (error) {
      setStatus('error');
      setErrorMsg(errorDescription || error || '授权失败');
      // 通知父窗口授权失败
      if (window.opener) {
        window.opener.postMessage(
          { type: 'mcp_oauth_callback', error: errorDescription || error },
          window.location.origin
        );
      }
      return;
    }

    if (code) {
      setStatus('success');
      // 通知父窗口授权成功，传递 code 和 state
      if (window.opener) {
        window.opener.postMessage(
          { type: 'mcp_oauth_callback', code, state },
          window.location.origin
        );
      }
    } else {
      setStatus('error');
      setErrorMsg('未收到授权码');
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-sm w-full mx-4 bg-white rounded-xl shadow-lg p-8 text-center">
        {status === 'processing' && (
          <>
            <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600 font-medium">处理授权中...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="text-4xl mb-4">✅</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">授权成功</h3>
            <p className="text-sm text-gray-500">此窗口将自动关闭</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="text-4xl mb-4">❌</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">授权失败</h3>
            <p className="text-sm text-red-500 mb-4">{errorMsg}</p>
            <p className="text-xs text-gray-400">你可以关闭此窗口并重试</p>
          </>
        )}
      </div>
    </div>
  );
}
