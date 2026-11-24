'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { PageSkeleton } from '@/components/Skeleton';
import { ApiError, api } from '@/lib/api';

/** Sessiyani tekshiradi: kirmagan bo'lsa /login ga, admin bo'lmasa xabar ko'rsatadi. */
export function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<'checking' | 'ok' | 'forbidden'>('checking');

  useEffect(() => {
    api<{ role: string; mustChangePassword: boolean }>('/me')
      .then((me) => {
        if (me.mustChangePassword) router.replace('/change-password');
        else setState(me.role === 'MAHALLA_ADMIN' ? 'ok' : 'forbidden');
      })
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 401) router.replace('/login');
        else setState('ok');
      });
  }, [router]);

  if (state === 'checking') return <PageSkeleton />;
  if (state === 'forbidden') return <p className="error-text" style={{ padding: 24 }}>Bu panel faqat mahalla adminlari uchun.</p>;
  return <>{children}</>;
}
