'use client';

import Link from 'next/link';
import { use } from 'react';
import { DataTable } from '@/components/DataTable';
import { PageHeader } from '@/components/PageHeader';
import { DefinitionList, Section } from '@/components/Section';
import { fmtDate, fmtDateTime } from '@/lib/format';
import { useFetch } from '@/lib/hooks';

interface RankRow {
  rank: number;
  title: string;
  votes: number;
  issueId: string;
}

interface RoundResult {
  periodStart: string;
  periodEnd: string;
  closedAt: string | null;
  winner: RankRow | null;
  ranking: RankRow[];
  totalVoters: number | null;
  totalVotes: number | null;
  message: string | null;
}

// API: GET /admin/rounds/:id/result  (g'olibni almashtirish endpointi YO'Q — ataylab)
export default function RoundResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: r, error } = useFetch<RoundResult>(`/admin/rounds/${id}/result`);

  return (
    <>
      <PageHeader
        title="Davr natijasi"
        description={`#${id}`}
        actions={
          <Link href="/rounds" className="btn">
            Davrlarga qaytish
          </Link>
        }
      />
      {error ? <p className="error-text">{error}</p> : null}
      {r ? (
        <>
          <Section title="Umumiy">
            <DefinitionList
              items={[
                ['Davr', `${fmtDate(r.periodStart)} — ${fmtDate(r.periodEnd)}`],
                ['Yopilgan', fmtDateTime(r.closedAt)],
                ["G'olib", r.winner ? `${r.winner.title} (${r.winner.votes} ovoz)` : (r.message ?? '—')],
                ['Ovoz berganlar', r.totalVoters ?? '—'],
                ['Jami ovoz', r.totalVotes ?? '—'],
              ]}
            />
          </Section>
          <Section title="Reyting">
            <DataTable
              columns={[
                { key: 'rank', label: '#' },
                { key: 'title', label: 'Muammo' },
                { key: 'votes', label: 'Ovozlar' },
              ]}
              rows={r.ranking.map((x) => ({
                rank: x.rank,
                title: <Link href={`/issues/${x.issueId}`}>{x.title}</Link>,
                votes: x.votes,
              }))}
              emptyTitle="Reyting yo'q"
              emptyHint=""
            />
          </Section>
        </>
      ) : null}
    </>
  );
}
