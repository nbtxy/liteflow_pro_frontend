'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { clearTokens } from '@/lib/auth';
import { toast } from '@/components/ui/Toast';
import { useLanguage } from '@/lib/i18n/context';
import { useChatStore } from '@/stores/chat';

export function UserMenu({ isCollapsed }: { isCollapsed?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { locale, setLocale, t } = useLanguage();
  const resetChatState = useChatStore((s) => s.resetChatState);
  const [langSubOpen, setLangSubOpen] = useState(false);
  const [profile, setProfile] = useState<{ name?: string | null; phone?: string | null } | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = sessionStorage.getItem('liteflow_user_profile');
      return raw ? (JSON.parse(raw) as { name?: string | null; phone?: string | null }) : null;
    } catch {
      return null;
    }
  });

  const userName = profile?.name?.trim() || profile?.phone || 'LiteFlow User';
  const userSubText = profile?.phone || '';
  const userAvatar = userName.charAt(0).toUpperCase();

  // 点击外部关闭面板
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const syncFromCache = () => {
      try {
        const raw = sessionStorage.getItem('liteflow_user_profile');
        setProfile(raw ? (JSON.parse(raw) as { name?: string | null; phone?: string | null }) : null);
      } catch {
        setProfile(null);
      }
    };
    window.addEventListener('storage', syncFromCache);
    return () => window.removeEventListener('storage', syncFromCache);
  }, []);

  const handleLogout = () => {
    resetChatState();
    sessionStorage.removeItem('liteflow_user_profile');
    clearTokens();
    toast.success(t.common.loggedOut);
    router.push('/login');
  };

  return (
    <div className="relative p-3 border-t border-gray-200 bg-gray-50/50" ref={menuRef}>
      {/* 弹出面板 */}
      {isOpen && (
        <div className={`absolute bottom-[calc(100%-8px)] ${isCollapsed ? 'left-3 w-56' : 'left-3 right-3'} bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200`}>
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-gray-900 truncate">{userName}</p>
              <button
                onClick={() => {
                  setIsOpen(false);
                  router.push('/onboarding/username');
                }}
                aria-label={t.common.editUsername}
                title={t.common.editUsername}
                className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 11l6.232-6.232a2.5 2.5 0 113.536 3.536L12.536 14.536a4 4 0 01-1.414.943L8 16l.521-3.122A4 4 0 019 11z" />
                </svg>
              </button>
            </div>
            {userSubText && <p className="text-xs text-gray-500 truncate mt-0.5">{userSubText}</p>}
          </div>
          
          <div className="py-1 border-b border-gray-100">
            <button
              onClick={() => {
                setIsOpen(false);
                router.push('/chat/usage');
              }}
              className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {t.common.quota}
            </button>
            
            <button
              onClick={() => setLangSubOpen(!langSubOpen)}
              className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
                {t.common.language}
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                  {locale === 'zh' ? '中文' : 'EN'}
                </span>
                <svg className={`w-3 h-3 text-gray-400 transition-transform ${langSubOpen ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
            {langSubOpen && (
              <div className="border-t border-gray-100 bg-gray-50/50">
                <button
                  onClick={() => { setLocale('zh'); setLangSubOpen(false); setIsOpen(false); }}
                  className={`w-full text-left px-8 py-2 text-sm flex items-center justify-between transition-colors ${locale === 'zh' ? 'text-teal-600 font-medium bg-teal-50/50' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  中文
                  {locale === 'zh' && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                </button>
                <button
                  onClick={() => { setLocale('en'); setLangSubOpen(false); setIsOpen(false); }}
                  className={`w-full text-left px-8 py-2 text-sm flex items-center justify-between transition-colors ${locale === 'en' ? 'text-teal-600 font-medium bg-teal-50/50' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  English
                  {locale === 'en' && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                </button>
              </div>
            )}
          </div>

          <div className="py-1">
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-gray-50 flex items-center gap-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              {t.common.signOut}
            </button>
          </div>
        </div>
      )}

      {/* 用户信息按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-2'} py-2 rounded-lg transition-colors ${
          isOpen ? 'bg-gray-200' : 'hover:bg-gray-200/50'
        }`}
        title={isCollapsed ? userName : undefined}
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 text-white flex items-center justify-center font-medium shadow-sm shrink-0">
          {userAvatar}
        </div>
        {!isCollapsed && (
          <>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{userName}</p>
            </div>
            <svg 
              className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </>
        )}
      </button>
    </div>
  );
}
