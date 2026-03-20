'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { clearTokens } from '@/lib/auth';
import { toast } from '@/components/ui/Toast';

export function UserMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Mock user data
  const user = {
    name: 'LiteFlow User',
    email: 'user@liteflow.pro',
    avatar: 'L'
  };

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

  const handleLogout = () => {
    clearTokens();
    toast.success('已退出登录');
    router.push('/login');
  };

  return (
    <div className="relative p-3 border-t border-gray-200 bg-gray-50/50" ref={menuRef}>
      {/* 弹出面板 */}
      {isOpen && (
        <div className="absolute bottom-[calc(100%-8px)] left-3 right-3 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
            <p className="text-xs text-gray-500 truncate mt-0.5">{user.email}</p>
          </div>
          
          <div className="py-1">
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-gray-50 flex items-center gap-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              退出登录
            </button>
          </div>
        </div>
      )}

      {/* 用户信息按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg transition-colors ${
          isOpen ? 'bg-gray-200' : 'hover:bg-gray-200/50'
        }`}
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center font-medium shadow-sm shrink-0">
          {user.avatar}
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
        </div>
        <svg 
          className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      </button>
    </div>
  );
}
