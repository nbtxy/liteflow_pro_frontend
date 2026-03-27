/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const auth = isAuthenticated();
    if (!auth) {
      router.replace('/login');
    } else {
      setAuthed(true);
    }
    setChecked(true);
  }, [router]);

  if (!checked || !authed) {
    return null;
  }

  return <>{children}</>;
}
