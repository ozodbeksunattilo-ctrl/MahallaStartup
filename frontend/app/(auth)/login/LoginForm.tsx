'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { ApiError, api } from '@/lib/api';

// API: POST /auth/login { login, password, client: "web" } -> Set-Cookie mhd_session
export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [show, setShow] = useState(false);
  const [caps, setCaps] = useState(false);
  // Xatoda forma tebranadi; animatsiya tugagach sinf olinadi, shunda keyingi xatoda yana ishlaydi
  const [shaking, setShaking] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    setError(null);
    try {
      const res = await api<{ mustChangePassword: boolean }>('/auth/login', {
        method: 'POST',
        json: {
          login: String(form.get('login') ?? '').trim().toLowerCase(),
          password: String(form.get('password') ?? ''),
          client: 'web',
        },
      });
      router.replace(res.mustChangePassword ? '/change-password' : '/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Serverga ulanib bo'lmadi");
      setShaking(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className={shaking ? 'lg-form lg-shake' : 'lg-form'} onAnimationEnd={() => setShaking(false)}>
      <label className="lg-field">
        <span className="lg-label">Login</span>
        <span className="lg-input-wrap">
          <svg className="lg-ico" viewBox="0 0 24 24" aria-hidden>
            <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-3.3 0-8 1.7-8 5v1h16v-1c0-3.3-4.7-5-8-5Z" />
          </svg>
          <input
            className="lg-input"
            name="login"
            autoComplete="username"
            placeholder="admin.yunusobod"
            maxLength={64}
            autoFocus
            required
          />
        </span>
      </label>
      <label className="lg-field">
        <span className="lg-label">Parol</span>
        <span className="lg-input-wrap">
          <svg className="lg-ico" viewBox="0 0 24 24" aria-hidden>
            <path d="M17 9h-1V7a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2Zm-7-2a2 2 0 0 1 4 0v2h-4V7Z" />
          </svg>
          <input
            className="lg-input"
            name="password"
            type={show ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="••••••••"
            maxLength={200}
            onKeyUp={(e) => setCaps(e.getModifierState('CapsLock'))}
            required
          />
          <button
            type="button"
            className="lg-eye"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? 'Parolni yashirish' : "Parolni ko'rsatish"}
          >
            {show ? 'Yashir' : "Ko'rsat"}
          </button>
        </span>
        {caps ? <span className="lg-hint">Caps Lock yoqilgan</span> : null}
      </label>
      {error ? <p className="lg-error">{error}</p> : null}
      <button className="lg-btn" type="submit" disabled={pending}>
        {pending ? <span className="lg-spin" aria-hidden /> : null}
        <span>{pending ? 'Kirilmoqda...' : 'Kirish'}</span>
        {pending ? null : <span className="lg-arrow">→</span>}
      </button>
    </form>
  );
}
