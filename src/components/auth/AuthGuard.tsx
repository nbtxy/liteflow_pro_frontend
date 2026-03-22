'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const isAuth = isAuthenticated();
      const isLoginPage = pathname === '/login';

      if (!isAuth && !isLoginPage) {
        router.replace('/login');
      } else if (isAuth && isLoginPage) {
        router.replace('/chat');
      } else {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [pathname, router]);

  // Optionally, we could return a loading state here
  // to avoid rendering children that shouldn't be seen before redirect.
  // But to avoid hydration mismatch or blank screens too long, returning null while checking is fine.
  if (isChecking) {
    return null; 
  }

  return <>{children}</>;
}