'use client';

import Link from 'next/link';
import { Badge } from '@/components/Badge';
import { DataTable } from '@/components/DataTable';
import { PageHeader } from '@/components/PageHeader';
import { fmtDateTime } from '@/lib/format';
import { useFetch } from '@/lib/hooks';

interface Announcement {
  id: string;
  title: string;
  isImportant: boolean;
  status: 'DRAFT' | 'PUBLISHED';
  publishedAt: string | null;
}

// API: GET /announcements  (admin qoralamalarni ham ko'radi)
export default function AnnouncementsPage() {
  const { data, error, loading } = useFetch<{ items: Announcement[] }>('/announcements?limit=50');
  return (
    <>
      <PageHeader
        title="E'lonlar"
        description="Mahalla a'zolariga e'lonlar"
        actions={
          <Link href="/announcements/new" className="btn btn-primary">
            Yangi e&apos;lon
          </Link>
        }
      />
      {error ? <p className="error-text">{error}</p> : null}
      <DataTable
        columns={[
          { key: 'title', label: 'Sarlavha' },
          { key: 'important', label: 'Muhim' },
          { key: 'status', label: 'Holat' },
          { key: 'publishedAt', label: 'Nashr sanasi' },
          { key: 'open', label: '' },
        ]}
        rows={(data?.items ?? []).map((a) => ({
          title: <strong>{a.title}</strong>,
          important: a.isImportant ? <Badge status="flag:IMPORTANT">Muhim</Badge> : '—',
          status: <Badge status={`announcement:${a.status}`}>{a.status === 'PUBLISHED' ? 'Nashr qilingan' : 'Qoralama'}</Badge>,
          publishedAt: fmtDateTime(a.publishedAt),
          open: (
            <Link href={`/announcements/${a.id}`} className="btn">
              Ochish
            </Link>
          ),
        }))}
        emptyTitle={loading ? 'Yuklanmoqda…' : "E'lonlar yo'q"}
        emptyHint=""
      />
    </>
  );
}
