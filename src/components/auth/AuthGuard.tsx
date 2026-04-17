'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { apiFetch } from '@/lib/api';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const auth = isAuthenticated();
      if (!auth) {
        sessionStorage.removeItem('liteflow_user_profile');
        router.replace('/login');
        if (!cancelled) setChecked(true);
        return;
      }
      try {
        const profile = await apiFetch<{ name?: string | null }>('/api/user/profile');
        sessionStorage.setItem('liteflow_user_profile', JSON.stringify(profile));
        const name = typeof profile?.name === 'string' ? profile.name.trim() : '';
        if (name === '') {
          router.replace('/onboarding/username');
          if (!cancelled) setAuthed(false);
          return;
        }
        if (!cancelled) setAuthed(true);
      } catch {
        sessionStorage.removeItem('liteflow_user_profile');
        if (!cancelled) setAuthed(false);
      } finally {
        if (!cancelled) setChecked(true);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!checked || !authed) {
    return null;
  }

  return <>{children}</>;
}
