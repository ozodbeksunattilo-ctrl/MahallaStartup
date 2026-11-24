'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { Badge } from '@/components/Badge';
import { DataTable } from '@/components/DataTable';
import { PageHeader } from '@/components/PageHeader';
import { fmtDate } from '@/lib/format';
import { useFetch } from '@/lib/hooks';
import { ISSUE_STATUS_LABELS } from '@/lib/labels';

interface IssueRow {
  id: string;
  title: string;
  categoryLabel: string;
  status: string;
  statusLabel: string;
  voteCount: number | null;
  responsible: string | null;
  dueDate: string | null;
  hidden: boolean;
}

function IssuesTable() {
  const params = useSearchParams();
  const [status, setStatus] = useState('');
  const [overdue, setOverdue] = useState(params.get('overdue') === 'true');
  const q = new URLSearchParams({ limit: '50' });
  if (status) q.set('status', status);
  if (overdue) q.set('overdue', 'true');
  const { data, error, loading } = useFetch<{ items: IssueRow[] }>(`/admin/issues?${q.toString()}`);

  return (
    <>
      <div className="filters">
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Barcha holatlar</option>
          {Object.entries(ISSUE_STATUS_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <label className="check">
          <input type="checkbox" checked={overdue} onChange={(e) => setOverdue(e.target.checked)} />
          Faqat muddati o&apos;tganlar
        </label>
      </div>
      {error ? <p className="error-text">{error}</p> : null}
      <DataTable
        columns={[
          { key: 'title', label: 'Sarlavha' },
          { key: 'category', label: 'Toifa' },
          { key: 'status', label: 'Holat' },
          { key: 'votes', label: 'Ovozlar' },
          { key: 'responsible', label: "Mas'ul" },
          { key: 'dueDate', label: 'Muddat' },
        ]}
        rows={(data?.items ?? []).map((i) => ({
          title: (
            <Link href={`/issues/${i.id}`}>
              <strong>{i.title}</strong> {i.hidden ? <Badge status="flag:HIDDEN">Yashirin</Badge> : null}
            </Link>
          ),
          category: i.categoryLabel,
          status: <Badge status={`issue:${i.status}`}>{i.statusLabel}</Badge>,
          votes: i.voteCount ?? '—',
          responsible: i.responsible ?? '—',
          dueDate: fmtDate(i.dueDate),
        }))}
        emptyTitle={loading ? 'Yuklanmoqda…' : "Muammolar yo'q"}
        emptyHint=""
      />
    </>
  );
}

// API: GET /admin/issues?status&overdue&cursor
export default function AdminIssuesPage() {
  return (
    <>
      <PageHeader title="Muammolar" description="Mahalladagi barcha muammolar va ularning holati" />
      <Suspense fallback={<p className="muted">Yuklanmoqda…</p>}>
        <IssuesTable />
      </Suspense>
    </>
  );
}
