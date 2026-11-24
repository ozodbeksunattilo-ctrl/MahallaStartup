'use client';

import Link from 'next/link';
import { DataTable } from '@/components/DataTable';
import { PageHeader } from '@/components/PageHeader';
import { ReasonAction } from '@/components/ReasonAction';
import { fmtDateTime } from '@/lib/format';
import { useAction, useFetch } from '@/lib/hooks';
import { api } from '@/lib/api';

interface QueueItem {
  id: string;
  title: string;
  categoryLabel: string;
  locationText: string;
  authorName: string;
  createdAt: string;
}

// API: GET /admin/moderation/queue · POST /admin/issues/:id/approve · POST /admin/issues/:id/reject { reason }
export default function ModerationPage() {
  const { data, error, loading, reload } = useFetch<{ items: QueueItem[] }>('/admin/moderation/queue');
  const action = useAction();

  const approve = (id: string) =>
    action.run(async () => {
      await api(`/admin/issues/${id}/approve`, { method: 'POST' });
      await reload();
    });
  const reject = (id: string, reason: string) =>
    action.run(async () => {
      await api(`/admin/issues/${id}/reject`, { method: 'POST', json: { reason } });
      await reload();
    });

  return (
    <>
      <PageHeader title="Moderatsiya navbati" description="Tasdiqlanmagan muammolar (eskisi birinchi)" />
      {error ? <p className="error-text">{error}</p> : null}
      {action.error ? <p className="error-text">{action.error}</p> : null}
      <DataTable
        columns={[
          { key: 'title', label: 'Muammo' },
          { key: 'category', label: 'Toifa' },
          { key: 'author', label: 'Muallif' },
          { key: 'createdAt', label: 'Yuborilgan' },
          { key: 'actions', label: '' },
        ]}
        rows={(data?.items ?? []).map((i) => ({
          title: (
            <Link href={`/issues/${i.id}`}>
              <strong>{i.title}</strong>
              <div className="muted">{i.locationText}</div>
            </Link>
          ),
          category: i.categoryLabel,
          author: i.authorName,
          createdAt: fmtDateTime(i.createdAt),
          actions: (
            <span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-primary" disabled={action.busy} onClick={() => void approve(i.id)}>
                Tasdiqlash
              </button>
              <ReasonAction label="Rad etish" danger disabled={action.busy} onSubmit={(r) => reject(i.id, r)} />
            </span>
          ),
        }))}
        emptyTitle={loading ? 'Yuklanmoqda…' : 'Navbat bo‘sh'}
        emptyHint={loading ? '' : 'Moderatsiyani kutayotgan muammo yo‘q.'}
      />
    </>
  );
}
