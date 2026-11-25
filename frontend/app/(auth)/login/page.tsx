import type { Metadata } from 'next';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = { title: 'Kirish' };

export default function LoginPage() {
  return (
    <div className="lg-card">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-mark.png" alt="Mahalladosh" className="lg-logo" />
      <h1 className="lg-title">Xush kelibsiz</h1>
      <p className="lg-sub">Mahalla admini sifatida tizimga kiring</p>
      <LoginForm />
      <p className="lg-foot">Mahallamiz — bizning kuchimiz</p>
    </div>
  );
}
