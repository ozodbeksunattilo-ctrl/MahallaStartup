'use client';

import Link from 'next/link';
import { use, useState } from 'react';
import { Badge } from '@/components/Badge';
import { DataTable } from '@/components/DataTable';
import { Field } from '@/components/Field';
import { PageHeader } from '@/components/PageHeader';
import { DefinitionList, Section } from '@/components/Section';
import { api } from '@/lib/api';
import { fmtDateTime } from '@/lib/format';
import { useAction, useFetch } from '@/lib/hooks';
import { EVENT_STATUS_LABELS } from '@/lib/labels';

interface EventDetail {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string | null;
  location: string;
  organizer: string;
  status: string;
  resultText: string | null;
  rsvpCount: number;
}

interface Attendee {
  id: string;
  login: string;
  displayName: string;
  phone: string | null;
  rsvpAt: string;
}

// API: GET /events/:id · POST /admin/events/:id/publish | /cancel | /complete · GET /admin/events/:id/attendees
export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: e, error, reload } = useFetch<EventDetail>(`/events/${id}`);
  const attendees = useFetch<{ items: Attendee[]; total: number }>(`/admin/events/${id}/attendees`);
  const action = useAction();
  const [result, setResult] = useState('');

  const post = (path: string, json?: unknown) =>
    action.run(async () => {
      await api(`/admin/events/${id}${path}`, { method: 'POST', json });
      await reload();
      await attendees.reload();
    });

  return (
    <>
      <PageHeader
        title={e?.title ?? 'Tadbir'}
        description={`#${id}`}
        actions={
          <Link href="/events" className="btn">
            Ro&apos;yxatga qaytish
          </Link>
        }
      />
      {error ? <p className="error-text">{error}</p> : null}
      {action.error ? <p className="error-text">{action.error}</p> : null}
      {e ? (
        <>
          <Section title="Ma'lumotlar">
            <DefinitionList
              items={[
                ['Holat', <Badge key="s" status={`event:${e.status}`}>{EVENT_STATUS_LABELS[e.status] ?? e.status}</Badge>],
                ['Tavsif', e.description],
                ['Boshlanish', fmtDateTime(e.startsAt)],
                ['Tugash', fmtDateTime(e.endsAt)],
                ['Joy', e.location],
                ['Tashkilotchi', e.organizer],
                ['Yozilganlar', e.rsvpCount],
                ['Natija', e.resultText],
              ]}
            />
          </Section>

          <Section title="Amallar">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {e.status === 'DRAFT' ? (
                <button type="button" className="btn btn-primary" disabled={action.busy} onClick={() => void post('/publish')}>
                  Nashr qilish
                </button>
              ) : null}
              {e.status === 'PUBLISHED' ? (
                <button type="button" className="btn btn-danger" disabled={action.busy} onClick={() => void post('/cancel')}>
                  Bekor qilish
                </button>
              ) : null}
            </div>
            {e.status === 'PUBLISHED' ? (
              <div style={{ marginTop: 12 }}>
                <Field label="Yakunlash: natija matni (ixtiyoriy)" wide>
                  <textarea className="input" rows={3} value={result} onChange={(ev) => setResult(ev.target.value)} />
                </Field>
                <button
                  type="button"
                  className="btn"
                  disabled={action.busy}
                  onClick={() => void post('/complete', { resultText: result.trim() || undefined })}
                >
                  Yakunlash
                </button>
              </div>
            ) : null}
          </Section>

          <Section title={`Yozilganlar (${attendees.data?.total ?? 0})`}>
            <DataTable
              columns={[
                { key: 'name', label: 'Ism' },
                { key: 'login', label: 'Login' },
                { key: 'phone', label: 'Telefon' },
                { key: 'rsvpAt', label: 'Yozilgan vaqt' },
              ]}
              rows={(attendees.data?.items ?? []).map((a) => ({
                name: a.displayName,
                login: a.login,
                phone: a.phone ?? '—',
                rsvpAt: fmtDateTime(a.rsvpAt),
              }))}
              emptyTitle="Hali yozilganlar yo'q"
              emptyHint=""
            />
          </Section>
        </>
      ) : null}
    </>
  );
}
