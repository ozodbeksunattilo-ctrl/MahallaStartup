'use client';

import Link from 'next/link';
import { Badge } from '@/components/Badge';
import { DataTable } from '@/components/DataTable';
import { PageHeader } from '@/components/PageHeader';
import { fmtDateTime } from '@/lib/format';
import { useFetch } from '@/lib/hooks';
import { EVENT_STATUS_LABELS } from '@/lib/labels';

interface EventRow {
  id: string;
  title: string;
  startsAt: string;
  location: string;
  status: string;
  rsvpCount: number;
}

// API: GET /admin/events?status (qoralamalar bilan)
export default function EventsPage() {
  const { data, error, loading } = useFetch<{ items: EventRow[] }>('/admin/events?limit=50');
  return (
    <>
      <PageHeader
        title="Tadbirlar"
        description="Mahalla tadbirlari"
        actions={
          <Link href="/events/new" className="btn btn-primary">
            Yangi tadbir
          </Link>
        }
      />
      {error ? <p className="error-text">{error}</p> : null}
      <DataTable
        columns={[
          { key: 'title', label: 'Nomi' },
          { key: 'startsAt', label: 'Boshlanish' },
          { key: 'location', label: 'Joy' },
          { key: 'status', label: 'Holat' },
          { key: 'rsvp', label: 'Yozilganlar' },
          { key: 'open', label: '' },
        ]}
        rows={(data?.items ?? []).map((e) => ({
          title: <strong>{e.title}</strong>,
          startsAt: fmtDateTime(e.startsAt),
          location: e.location,
          status: <Badge status={`event:${e.status}`}>{EVENT_STATUS_LABELS[e.status] ?? e.status}</Badge>,
          rsvp: e.rsvpCount,
          open: (
            <Link href={`/events/${e.id}`} className="btn">
              Ochish
            </Link>
          ),
        }))}
        emptyTitle={loading ? 'Yuklanmoqda…' : "Tadbirlar yo'q"}
        emptyHint=""
      />
    </>
  );
}
