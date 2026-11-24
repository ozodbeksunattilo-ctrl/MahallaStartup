'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { use, type FormEvent } from 'react';
import { Badge } from '@/components/Badge';
import { Field } from '@/components/Field';
import { PageHeader } from '@/components/PageHeader';
import { Section } from '@/components/Section';
import { api } from '@/lib/api';
import { fmtDateTime } from '@/lib/format';
import { useAction, useFetch } from '@/lib/hooks';

interface Announcement {
  id: string;
  title: string;
  body: string;
  isImportant: boolean;
  status: 'DRAFT' | 'PUBLISHED';
  publishedAt: string | null;
}

// API: GET /announcements/:id · PATCH /admin/announcements/:id · POST .../publish · DELETE (faqat qoralama)
export default function AnnouncementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: a, error, reload } = useFetch<Announcement>(`/announcements/${id}`);
  const action = useAction();

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    await action.run(async () => {
      await api(`/admin/announcements/${id}`, {
        method: 'PATCH',
        json: { title: String(f.get('title')).trim(), body: String(f.get('body')).trim(), isImportant: f.get('isImportant') === 'on' },
      });
      await reload();
    });
  }
  const publish = () =>
    action.run(async () => {
      await api(`/admin/announcements/${id}/publish`, { method: 'POST' });
      await reload();
    });
  const remove = async () => {
    const ok = await action.run(() => api(`/admin/announcements/${id}`, { method: 'DELETE' }).then(() => true));
    if (ok) router.replace('/announcements');
  };

  return (
    <>
      <PageHeader
        title="E'lon"
        description={`#${id}`}
        actions={
          <Link href="/announcements" className="btn">
            Ro&apos;yxatga qaytish
          </Link>
        }
      />
      {error ? <p className="error-text">{error}</p> : null}
      {action.error ? <p className="error-text">{action.error}</p> : null}
      {a ? (
        <Section>
          <p>
            <Badge status={`announcement:${a.status}`}>{a.status === 'PUBLISHED' ? 'Nashr qilingan' : 'Qoralama'}</Badge>{' '}
            <span className="muted">{a.publishedAt ? fmtDateTime(a.publishedAt) : ''}</span>
          </p>
          <form onSubmit={(e) => void save(e)} key={`${a.id}-${a.title}-${a.body}`}>
            <div className="form-grid">
              <Field label="Sarlavha" wide>
                <input className="input" name="title" defaultValue={a.title} required minLength={3} maxLength={150} />
              </Field>
              <Field label="Matn" wide>
                <textarea className="input" name="body" rows={6} defaultValue={a.body} required minLength={3} />
              </Field>
              <label className="check">
                <input type="checkbox" name="isImportant" defaultChecked={a.isImportant} />
                Muhim e&apos;lon
              </label>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="submit" className="btn" disabled={action.busy}>
                Saqlash
              </button>
              {a.status === 'DRAFT' ? (
                <>
                  <button type="button" className="btn btn-primary" disabled={action.busy} onClick={() => void publish()}>
                    Nashr qilish
                  </button>
                  <button type="button" className="btn btn-danger" disabled={action.busy} onClick={() => void remove()}>
                    O&apos;chirish
                  </button>
                </>
              ) : null}
            </div>
          </form>
        </Section>
      ) : null}
    </>
  );
}
