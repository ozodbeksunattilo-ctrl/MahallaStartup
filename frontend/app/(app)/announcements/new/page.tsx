'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { Field } from '@/components/Field';
import { PageHeader } from '@/components/PageHeader';
import { Section } from '@/components/Section';
import { api } from '@/lib/api';
import { useAction } from '@/lib/hooks';

// API: POST /admin/announcements { title, body, isImportant }  (DRAFT, keyin /publish)
export default function NewAnnouncementPage() {
  const router = useRouter();
  const action = useAction();

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const created = await action.run(() =>
      api<{ id: string }>('/admin/announcements', {
        method: 'POST',
        json: { title: String(f.get('title')).trim(), body: String(f.get('body')).trim(), isImportant: f.get('isImportant') === 'on' },
      }),
    );
    if (created) router.replace(`/announcements/${created.id}`);
  }

  return (
    <>
      <PageHeader
        title="Yangi e'lon"
        actions={
          <Link href="/announcements" className="btn">
            Ro&apos;yxatga qaytish
          </Link>
        }
      />
      <Section>
        <form onSubmit={(e) => void submit(e)}>
          <div className="form-grid">
            <Field label="Sarlavha" wide>
              <input className="input" name="title" required minLength={3} maxLength={150} />
            </Field>
            <Field label="Matn" wide>
              <textarea className="input" name="body" rows={6} required minLength={3} />
            </Field>
            <label className="check">
              <input type="checkbox" name="isImportant" />
              Muhim e&apos;lon (barcha a&apos;zolarga bildirishnoma yuboriladi)
            </label>
          </div>
          {action.error ? <p className="error-text">{action.error}</p> : null}
          <button type="submit" className="btn btn-primary" disabled={action.busy}>
            Qoralama sifatida saqlash
          </button>
        </form>
      </Section>
    </>
  );
}
