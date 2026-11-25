'use client';

import { useState } from 'react';
import { Badge } from '@/components/Badge';
import { DataTable } from '@/components/DataTable';
import { PageHeader } from '@/components/PageHeader';
import { api } from '@/lib/api';
import { errorText, useFetch } from '@/lib/hooks';

type Status = 'PENDING' | 'APPROVED' | 'REJECTED';

interface AccessRequest {
  id: string;
  fullName: string;
  phone: string;
  address: string | null;
  status: Status;
  createdAt: string;
}

interface Approved {
  login: string;
  temporaryPassword: string;
}

const STATUS_LABEL: Record<Status, string> = {
  PENDING: 'Kutilmoqda',
  APPROVED: 'Tasdiqlangan',
  REJECTED: 'Rad etilgan',
};

// API: GET /admin/access-requests?status · POST /admin/access-requests/:id/approve { login } · POST .../reject
export default function AccessRequestsPage() {
  const [status, setStatus] = useState<Status | ''>('PENDING');
  const [actionError, setError] = useState<string | null>(null);
  const [logins, setLogins] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [approved, setApproved] = useState<Approved | null>(null);

  const list = useFetch<{ items: AccessRequest[] }>(`/admin/access-requests${status ? `?status=${status}` : ''}`);
  const items = list.data?.items ?? [];
  const error = actionError ?? list.error;
  const load = list.reload;

  async function act(id: string, kind: 'approve' | 'reject') {
    setBusy(id);
    setError(null);
    try {
      if (kind === 'approve') {
        const res = await api<Approved>(`/admin/access-requests/${id}/approve`, {
          method: 'POST',
          json: { login: (logins[id] ?? '').trim().toLowerCase() },
        });
        setApproved(res);
      } else {
        await api(`/admin/access-requests/${id}/reject`, { method: 'POST', json: {} });
      }
      await load();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Kirish so'rovlari"
        description="Mobil ilovadan kelgan ro'yxatdan o'tish so'rovlari. Tasdiqlasangiz akkaunt va vaqtinchalik parol yaratiladi."
      />

      {approved ? (
        <div className="card" role="status" style={{ marginBottom: 16 }}>
          <strong>Akkaunt yaratildi — parolni hozir saqlang (qayta ko‘rsatilmaydi)</strong>
          <p>
            Login: <code>{approved.login}</code> · Vaqtinchalik parol: <code>{approved.temporaryPassword}</code>
          </p>
          <button type="button" className="btn" onClick={() => setApproved(null)}>
            Yopish
          </button>
        </div>
      ) : null}
      {error ? (
        <p role="alert" style={{ color: 'var(--danger, #c2321f)' }}>
          {error}
        </p>
      ) : null}

      <div className="filters">
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value as Status | '')}>
          <option value="PENDING">Kutilayotgan</option>
          <option value="APPROVED">Tasdiqlangan</option>
          <option value="REJECTED">Rad etilgan</option>
          <option value="">Hammasi</option>
        </select>
      </div>

      <DataTable
        columns={[
          { key: 'name', label: 'Ism' },
          { key: 'phone', label: 'Telefon' },
          { key: 'address', label: 'Manzil' },
          { key: 'status', label: 'Holat' },
          { key: 'date', label: 'Sana' },
          { key: 'actions', label: '' },
        ]}
        rows={items.map((r) => ({
          name: r.fullName,
          phone: r.phone,
          address: r.address ?? '—',
          status: <Badge status={`access:${r.status}`}>{STATUS_LABEL[r.status]}</Badge>,
          date: new Date(r.createdAt).toLocaleDateString('uz-UZ'),
          actions:
            r.status === 'PENDING' ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="input"
                  placeholder="login (masalan: ali.v)"
                  value={logins[r.id] ?? ''}
                  onChange={(e) => setLogins((p) => ({ ...p, [r.id]: e.target.value }))}
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={busy === r.id || (logins[r.id] ?? '').trim().length < 3}
                  onClick={() => void act(r.id, 'approve')}
                >
                  Tasdiqlash
                </button>
                <button type="button" className="btn btn-danger" disabled={busy === r.id} onClick={() => void act(r.id, 'reject')}>
                  Rad etish
                </button>
              </div>
            ) : null,
        }))}
        emptyTitle="So'rov yo'q"
        emptyHint="Yangi so'rovlar mobil ilovadan kelganda shu yerda paydo bo'ladi."
      />
    </>
  );
}
