'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { setTokens, isAuthenticated } from '@/lib/auth';
import { getApiUrl } from '@/lib/config';

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 已登录则跳转
  useEffect(() => {
    if (isAuthenticated()) {
      router.replace('/chat');
    }
  }, [router]);

  // 倒计时
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const sendCode = useCallback(async () => {
    if (!phone.trim() || countdown > 0) return;
    setError('');
    try {
      const res = await fetch(getApiUrl('/api/auth/send-code'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.message ?? '发送失败');
        return;
      }
      setCountdown(60);
    } catch {
      setError('网络错误，请重试');
    }
  }, [phone, countdown]);

  const handleLogin = useCallback(async () => {
    if (!phone.trim() || !code.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(getApiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.message ?? '登录失败');
        return;
      }
      const data = await res.json();
      setTokens(data.data?.accessToken ?? data.accessToken, data.data?.refreshToken ?? data.refreshToken);
      router.replace('/chat');
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  }, [phone, code, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm p-8 bg-white rounded-2xl shadow-lg">
        <h1 className="text-2xl font-bold text-center mb-8 text-gray-900">LiteFlow Assistant</h1>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>
        )}

        <div className="space-y-4">
          {/* 手机号 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">手机号</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="请输入手机号"
              maxLength={11}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 placeholder-gray-400"
            />
          </div>

          {/* 验证码 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">验证码</label>
            <div className="flex gap-3">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="请输入验证码"
                maxLength={6}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 placeholder-gray-400"
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
              <button
                onClick={sendCode}
                disabled={countdown > 0 || !phone.trim()}
                className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap transition-colors"
              >
                {countdown > 0 ? `${countdown}s` : '发送验证码'}
              </button>
            </div>
          </div>

          {/* 登录按钮 */}
          <button
            onClick={handleLogin}
            disabled={loading || !phone.trim() || !code.trim()}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </div>
      </div>
    </div>
  );
}
