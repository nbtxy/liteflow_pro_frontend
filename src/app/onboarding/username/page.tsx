'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { toast } from '@/components/ui/Toast';

export default function UsernameOnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [isComposing, setIsComposing] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
      return;
    }
    const loadProfile = async () => {
      try {
        const profile = await apiFetch<{ name?: string | null; phone?: string | null }>('/api/user/profile');
        const currentName = typeof profile?.name === 'string' ? profile.name.trim() : '';
        if (currentName) {
          setName(currentName);
        }
      } catch {
        // Keep form usable even if profile loading fails.
      }
    };
    loadProfile();
  }, [router]);

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('请输入用户名');
      return;
    }
    setLoading(true);
    try {
      await apiFetch('/api/user/name', {
        method: 'PUT',
        body: JSON.stringify({ name: trimmed }),
      });
      try {
        const raw = sessionStorage.getItem('liteflow_user_profile');
        const cached = raw ? (JSON.parse(raw) as { name?: string | null; phone?: string | null }) : {};
        sessionStorage.setItem('liteflow_user_profile', JSON.stringify({ ...cached, name: trimmed }));
      } catch {
        // Ignore cache update errors.
      }
      toast.success('用户名设置成功');
      router.replace('/chat');
    } catch {
      // apiFetch handles toast and redirect.
    } finally {
      setLoading(false);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') {
      return;
    }
    // During IME composition, Enter should confirm candidate text, not submit.
    if (isComposing || e.nativeEvent.isComposing) {
      return;
    }
    handleSubmit();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50/50 via-white to-gray-50">
      <div className="w-full max-w-sm p-8 bg-white rounded-3xl shadow-xl shadow-gray-200/50 ring-1 ring-gray-100">
        <h1 className="text-2xl font-bold text-gray-900">设置用户名</h1>
        <p className="mt-2 text-sm text-gray-500">你可以随时修改用户名</p>
        <div className="mt-6">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            onKeyDown={handleInputKeyDown}
            placeholder="请输入用户名"
            maxLength={50}
            className="w-full px-4 py-3.5 bg-gray-50 rounded-xl outline-none text-gray-900 placeholder-gray-400 text-base focus:ring-2 focus:ring-teal-500/20 focus:bg-white"
          />
          <button
            onClick={handleSubmit}
            disabled={loading || !name.trim()}
            className="mt-4 w-full py-3.5 bg-gradient-to-r from-teal-600 to-teal-500 text-white rounded-xl font-medium text-base disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '保存中...' : '保存并进入'}
          </button>
        </div>
      </div>
    </div>
  );
}
