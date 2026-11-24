import type { Metadata } from 'next';
import { ChangePasswordForm } from './ChangePasswordForm';

export const metadata: Metadata = { title: 'Parolni almashtirish' };

export default function ChangePasswordPage() {
  return (
    <div className="auth-card">
      <img src="/logo-mark.png" alt="Mahalladosh" className="auth-logo auth-logo-sm" />
      <h1>Parolni almashtirish</h1>
      <p className="muted">
        Vaqtinchalik parol bilan kirgan bo&apos;lsangiz, davom etish uchun yangi parol o&apos;rnating.
      </p>
      <ChangePasswordForm />
    </div>
  );
}
