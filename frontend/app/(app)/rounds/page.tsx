'use client';

import Link from 'next/link';
import { Badge } from '@/components/Badge';
import { DataTable } from '@/components/DataTable';
import { PageHeader } from '@/components/PageHeader';
import { fmtDate } from '@/lib/format';
import { useFetch } from '@/lib/hooks';

interface Round {
  id: string;
  periodStart: string;
  periodEnd: string;
  status: 'OPEN' | 'CLOSED';
  winner: { issueId: string; title: string; votes: number } | null;
  totalVoters: number | null;
  totalVotes: number | null;
}

// API: GET /admin/rounds
export default function RoundsPage() {
  const { data, error, loading } = useFetch<{ items: Round[] }>('/admin/rounds');
  return (
    <>
      <PageHeader title="Ovoz davrlari" description="Oylik ovoz berish davrlari va natijalari" />
      {error ? <p className="error-text">{error}</p> : null}
      <DataTable
        columns={[
          { key: 'period', label: 'Davr' },
          { key: 'status', label: 'Holat' },
          { key: 'winner', label: "G'olib" },
          { key: 'voters', label: 'Ovoz berganlar' },
          { key: 'votes', label: 'Jami ovoz' },
          { key: 'open', label: '' },
        ]}
        rows={(data?.items ?? []).map((r) => ({
          period: `${fmtDate(r.periodStart)} — ${fmtDate(r.periodEnd)}`,
          status: <Badge status={`round:${r.status}`}>{r.status === 'OPEN' ? 'Ochiq' : 'Yopilgan'}</Badge>,
          winner: r.winner ? r.winner.title : '—',
          voters: r.totalVoters ?? '—',
          votes: r.totalVotes ?? '—',
          open: (
            <Link href={`/rounds/${r.id}`} className="btn">
              Natija
            </Link>
          ),
        }))}
        emptyTitle={loading ? 'Yuklanmoqda…' : "Davrlar yo'q"}
        emptyHint=""
      />
    </>
  );
}
