'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { setTokens } from '@/lib/auth';
import { getApiUrl } from '@/lib/config';
import { useLanguage } from '@/lib/i18n/context';

export default function LoginPage() {
  const router = useRouter();
  const { locale, setLocale, t } = useLanguage();
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 点击外部关闭语言面板
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
        setError(data?.message ?? t.login.sendFailed);
        return;
      }
      const data = await res.json();
      if (data.code !== 200) {
        setError(data.message || t.login.sendFailed);
        return;
      }
      setCountdown(60);
    } catch {
      setError(t.login.networkError);
    }
  }, [phone, countdown, t]);

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
        setError(data?.message ?? t.login.loginFailed);
        return;
      }
      const json = await res.json();
      if (json.code !== 200) {
        setError(json.message || t.login.loginFailed);
        return;
      }
      const data = json.data;
      setTokens(data.accessToken, data.refreshToken);
      router.replace('/chat');
    } catch {
      setError(t.login.networkError);
    } finally {
      setLoading(false);
    }
  }, [phone, code, router, t]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 relative">
      {/* 语言切换 */}
      <div className="absolute top-4 right-4" ref={langRef}>
        <button
          onClick={() => setLangOpen(!langOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-gray-200 shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
          </svg>
          {locale === 'zh' ? '中文' : 'English'}
          <svg className={`w-3 h-3 transition-transform ${langOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {langOpen && (
          <div className="absolute right-0 mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-50">
            <button
              onClick={() => { setLocale('zh'); setLangOpen(false); }}
              className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors ${locale === 'zh' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              中文
              {locale === 'zh' && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
            </button>
            <button
              onClick={() => { setLocale('en'); setLangOpen(false); }}
              className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors ${locale === 'en' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              English
              {locale === 'en' && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
            </button>
          </div>
        )}
      </div>

      <div className="w-full max-w-sm p-8 bg-white rounded-2xl shadow-lg">
        <h1 className="text-2xl font-bold text-center mb-8 text-gray-900">
          {t.login.title}
        </h1>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>
        )}

        <div className="space-y-4">
          {/* 手机号 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.login.phoneLabel}
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t.login.phonePlaceholder}
              maxLength={11}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 placeholder-gray-400"
            />
          </div>

          {/* 验证码 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.login.codeLabel}
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={t.login.codePlaceholder}
                maxLength={6}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 placeholder-gray-400"
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
              <button
                onClick={sendCode}
                disabled={countdown > 0 || !phone.trim()}
                className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap transition-colors"
              >
                {countdown > 0 
                  ? `${countdown}s` 
                  : t.login.sendCode}
              </button>
            </div>
          </div>

          {/* 登录按钮 */}
          <button
            onClick={handleLogin}
            disabled={loading || !phone.trim() || !code.trim()}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading 
              ? t.login.submitting 
              : t.login.submit}
          </button>
        </div>
      </div>
    </div>
  );
}
