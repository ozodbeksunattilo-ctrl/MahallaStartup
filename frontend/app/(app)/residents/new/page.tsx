'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { Field } from '@/components/Field';
import { PageHeader } from '@/components/PageHeader';
import { Section } from '@/components/Section';
import { api } from '@/lib/api';
import { fmtDateTime } from '@/lib/format';
import { useAction } from '@/lib/hooks';

interface Created {
  user: { id: string; login: string; displayName: string };
  temporaryPassword: string;
  expiresAt: string;
}

// API: POST /admin/residents { displayName, login, phone? } -> { user, temporaryPassword, expiresAt }
export default function NewResidentPage() {
  const action = useAction();
  const [created, setCreated] = useState<Created | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const phone = String(f.get('phone') ?? '').trim();
    const res = await action.run(() =>
      api<Created>('/admin/residents', {
        method: 'POST',
        json: {
          displayName: String(f.get('displayName')).trim(),
          login: String(f.get('login')).trim().toLowerCase(),
          phone: phone || undefined,
        },
      }),
    );
    if (res) setCreated(res);
  }

  return (
    <>
      <PageHeader
        title="Yangi aholi"
        description="Akkaunt yaratiladi va vaqtinchalik parol (72 soat) bir marta ko'rsatiladi"
        actions={
          <Link href="/residents" className="btn">
            Ro&apos;yxatga qaytish
          </Link>
        }
      />
      <Section>
        <form onSubmit={(e) => void submit(e)}>
          <div className="form-grid">
            <Field label="Ism va familiya">
              <input className="input" name="displayName" required minLength={2} maxLength={100} />
            </Field>
            <Field label="Login" hint="3–32 belgi: kichik lotin harflari, raqam, nuqta, pastki chiziq">
              <input className="input" name="login" autoCapitalize="none" required pattern="[A-Za-z0-9._]{3,32}" />
            </Field>
            <Field label="Telefon (ixtiyoriy)" hint="Faqat aloqa uchun, kirish uchun emas">
              <input className="input" name="phone" type="tel" />
            </Field>
          </div>
          {action.error ? <p className="error-text">{action.error}</p> : null}
          <button type="submit" className="btn btn-primary" disabled={action.busy}>
            Akkaunt yaratish
          </button>
        </form>
      </Section>

      <Section title="Vaqtinchalik parol">
        {created ? (
          <>
            <p>
              <strong>{created.user.displayName}</strong> — login: <code>{created.user.login}</code>
            </p>
            <p>
              Parol: <code style={{ fontSize: 18 }}>{created.temporaryPassword}</code>
            </p>
            <p className="muted">Amal qilish muddati: {fmtDateTime(created.expiresAt)}. Bu parol boshqa ko&apos;rsatilmaydi.</p>
          </>
        ) : (
          <p className="muted">
            Akkaunt yaratilgach parol shu yerda <strong>faqat bir marta</strong> ko&apos;rsatiladi. Uni aholiga xavfsiz yo&apos;l bilan yetkazing; birinchi
            kirishda parol almashtirilishi shart.
          </p>
        )}
      </Section>
    </>
  );
}
