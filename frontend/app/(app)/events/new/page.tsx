'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { Field } from '@/components/Field';
import { PageHeader } from '@/components/PageHeader';
import { Section } from '@/components/Section';
import { api } from '@/lib/api';
import { localToIso } from '@/lib/format';
import { useAction } from '@/lib/hooks';

// API: POST /admin/events { title, description, startsAt, endsAt?, location, organizer }  (DRAFT, keyin /publish)
export default function NewEventPage() {
  const router = useRouter();
  const action = useAction();

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const s = (k: string) => String(f.get(k) ?? '').trim();
    const created = await action.run(() =>
      api<{ id: string }>('/admin/events', {
        method: 'POST',
        json: {
          title: s('title'),
          description: s('description'),
          startsAt: localToIso(s('startsAt')),
          endsAt: localToIso(s('endsAt')),
          location: s('location'),
          organizer: s('organizer'),
        },
      }),
    );
    if (created) router.replace(`/events/${created.id}`);
  }

  return (
    <>
      <PageHeader
        title="Yangi tadbir"
        actions={
          <Link href="/events" className="btn">
            Ro&apos;yxatga qaytish
          </Link>
        }
      />
      <Section>
        <form onSubmit={(e) => void submit(e)}>
          <div className="form-grid">
            <Field label="Nomi" wide>
              <input className="input" name="title" required minLength={3} maxLength={150} />
            </Field>
            <Field label="Tavsif" wide>
              <textarea className="input" name="description" rows={4} required minLength={10} />
            </Field>
            <Field label="Boshlanish vaqti">
              <input className="input" name="startsAt" type="datetime-local" required />
            </Field>
            <Field label="Tugash vaqti (ixtiyoriy)">
              <input className="input" name="endsAt" type="datetime-local" />
            </Field>
            <Field label="Joy">
              <input className="input" name="location" required minLength={3} />
            </Field>
            <Field label="Tashkilotchi">
              <input className="input" name="organizer" required minLength={2} />
            </Field>
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
