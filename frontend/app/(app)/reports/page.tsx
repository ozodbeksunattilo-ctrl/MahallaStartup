'use client';

import { useState } from 'react';
import { Badge } from '@/components/Badge';
import { DataTable } from '@/components/DataTable';
import { PageHeader } from '@/components/PageHeader';
import { ReasonAction } from '@/components/ReasonAction';
import { api } from '@/lib/api';
import { fmtDateTime } from '@/lib/format';
import { useAction, useFetch } from '@/lib/hooks';
import { REPORT_STATUS_LABELS, REPORT_TARGET_LABELS } from '@/lib/labels';

interface Report {
  id: string;
  targetType: string;
  reason: string;
  status: 'OPEN' | 'ACTIONED' | 'DISMISSED';
  createdAt: string;
  reporterName: string;
  contentPreview: string;
  contentHidden: boolean;
}

// API: GET /admin/reports?status · POST /admin/reports/:id/hide { reason } · POST /admin/reports/:id/dismiss
export default function ReportsPage() {
  const [status, setStatus] = useState('OPEN');
  const { data, error, loading, reload } = useFetch<{ items: Report[] }>(`/admin/reports${status ? `?status=${status}` : ''}`);
  const action = useAction();

  const hide = (id: string, reason: string) =>
    action.run(async () => {
      await api(`/admin/reports/${id}/hide`, { method: 'POST', json: { reason } });
      await reload();
    });
  const dismiss = (id: string) =>
    action.run(async () => {
      await api(`/admin/reports/${id}/dismiss`, { method: 'POST' });
      await reload();
    });

  return (
    <>
      <PageHeader title="Shikoyatlar" description="Aholi yuborgan kontent shikoyatlari" />
      <div className="filters">
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Hammasi</option>
          {Object.entries(REPORT_STATUS_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </div>
      {error ? <p className="error-text">{error}</p> : null}
      {action.error ? <p className="error-text">{action.error}</p> : null}
      <DataTable
        columns={[
          { key: 'type', label: 'Turi' },
          { key: 'content', label: 'Kontent' },
          { key: 'reason', label: 'Sabab' },
          { key: 'reporter', label: 'Shikoyatchi' },
          { key: 'status', label: 'Holat' },
          { key: 'createdAt', label: 'Sana' },
          { key: 'actions', label: '' },
        ]}
        rows={(data?.items ?? []).map((r) => ({
          type: REPORT_TARGET_LABELS[r.targetType] ?? r.targetType,
          content: r.contentPreview,
          reason: r.reason,
          reporter: r.reporterName,
          status: <Badge status={`report:${r.status}`}>{REPORT_STATUS_LABELS[r.status] ?? r.status}</Badge>,
          createdAt: fmtDateTime(r.createdAt),
          actions:
            r.status === 'OPEN' ? (
              <span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap' }}>
                <ReasonAction label="Yashirish" danger disabled={action.busy} onSubmit={(reason) => hide(r.id, reason)} />
                <button type="button" className="btn" disabled={action.busy} onClick={() => void dismiss(r.id)}>
                  Rad etish
                </button>
              </span>
            ) : null,
        }))}
        emptyTitle={loading ? 'Yuklanmoqda…' : 'Shikoyat yo‘q'}
        emptyHint=""
      />
    </>
  );
}
