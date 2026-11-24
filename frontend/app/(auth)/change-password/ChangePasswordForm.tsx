'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Field } from '@/components/Field';
import { ApiError, api } from '@/lib/api';

// API: POST /auth/change-password { currentPassword, newPassword }
export function ChangePasswordForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const currentPassword = String(form.get('currentPassword') ?? '');
    const newPassword = String(form.get('newPassword') ?? '');
    if (newPassword.length < 8) return setError("Yangi parol kamida 8 belgidan iborat bo'lsin");
    if (newPassword !== String(form.get('confirm') ?? '')) return setError('Parollar mos kelmadi');
    if (newPassword === currentPassword) return setError('Yangi parol eskisidan farq qilsin');

    setPending(true);
    setError(null);
    try {
      await api('/auth/change-password', { method: 'POST', json: { currentPassword, newPassword } });
      router.replace('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Serverga ulanib bo'lmadi");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <Field label="Joriy (vaqtinchalik) parol">
        <input className="input" name="currentPassword" type="password" autoComplete="current-password" required />
      </Field>
      <Field label="Yangi parol" hint="Kamida 8 belgi">
        <input className="input" name="newPassword" type="password" autoComplete="new-password" required />
      </Field>
      <Field label="Yangi parolni takrorlang">
        <input className="input" name="confirm" type="password" autoComplete="new-password" required />
      </Field>
      {error ? <p className="error-text">{error}</p> : null}
      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? 'Saqlanmoqda...' : 'Parolni saqlash'}
      </button>
    </form>
  );
}
