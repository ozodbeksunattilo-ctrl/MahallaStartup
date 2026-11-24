import type { ReactNode } from 'react';
import { AuthBackdrop } from '@/components/AuthBackdrop';
import './auth.css';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <AuthBackdrop>{children}</AuthBackdrop>;
}
