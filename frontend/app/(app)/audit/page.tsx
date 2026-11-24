'use client';

import { useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { PageHeader } from '@/components/PageHeader';
import { fmtDateTime } from '@/lib/format';
import { useFetch } from '@/lib/hooks';

interface AuditItem {
  id: string;
  action: string;
  actorName: string;
  targetType: string | null;
  targetId: string | null;
  reason: string | null;
  ip: string | null;
  createdAt: string;
}

// API: GET /admin/audit?action&cursor (parol/token hech qachon yozilmaydi)
export default function AuditPage() {
  const [action, setAction] = useState('');
  const { data, error, loading } = useFetch<{ items: AuditItem[] }>(
    `/admin/audit?limit=50${action ? `&action=${encodeURIComponent(action)}` : ''}`,
  );

  return (
    <>
      <PageHeader title="Audit jurnali" description="Admin amallari tarixi" />
      <div className="filters">
        <input
          className="input"
          placeholder="Amal bo'yicha filtr (masalan, issue.approve)"
          value={action}
          onChange={(e) => setAction(e.target.value.trim())}
        />
      </div>
      {error ? <p className="error-text">{error}</p> : null}
      <DataTable
        columns={[
          { key: 'createdAt', label: 'Vaqt' },
          { key: 'actor', label: 'Kim' },
          { key: 'action', label: 'Amal' },
          { key: 'target', label: "Ob'ekt" },
          { key: 'reason', label: 'Sabab' },
          { key: 'ip', label: 'IP' },
        ]}
        rows={(data?.items ?? []).map((a) => ({
          createdAt: fmtDateTime(a.createdAt),
          actor: a.actorName,
          action: <code>{a.action}</code>,
          target: a.targetType ? `${a.targetType} ${a.targetId?.slice(0, 8) ?? ''}` : '—',
          reason: a.reason ?? '—',
          ip: a.ip ?? '—',
        }))}
        emptyTitle={loading ? 'Yuklanmoqda…' : 'Yozuv yo‘q'}
        emptyHint=""
      />
    </>
  );
}
