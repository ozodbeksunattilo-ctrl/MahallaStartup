'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Badge } from '@/components/Badge';
import { DataTable } from '@/components/DataTable';
import { PageHeader } from '@/components/PageHeader';
import { fmtDate } from '@/lib/format';
import { useFetch } from '@/lib/hooks';

interface Resident {
  id: string;
  login: string;
  displayName: string;
  phone: string | null;
  status: 'ACTIVE' | 'BLOCKED';
  mustChangePassword: boolean;
  createdAt: string;
}

// API: GET /admin/residents?query&status&cursor
export default function ResidentsPage() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const q = new URLSearchParams({ limit: '50' });
  if (query) q.set('query', query);
  if (status) q.set('status', status);
  const { data, error, loading } = useFetch<{ items: Resident[] }>(`/admin/residents?${q.toString()}`);

  return (
    <>
      <PageHeader
        title="Aholi"
        description="Mahalla a'zolari. Akkauntlarni faqat admin yaratadi."
        actions={
          <Link href="/residents/new" className="btn btn-primary">
            Yangi aholi
          </Link>
        }
      />
      <div className="filters">
        <input className="input" placeholder="Ism, login yoki telefon" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Hammasi</option>
          <option value="ACTIVE">Faol</option>
          <option value="BLOCKED">Bloklangan</option>
        </select>
      </div>
      {error ? <p className="error-text">{error}</p> : null}
      <DataTable
        columns={[
          { key: 'name', label: 'Ism' },
          { key: 'login', label: 'Login' },
          { key: 'phone', label: 'Telefon' },
          { key: 'status', label: 'Holat' },
          { key: 'createdAt', label: "Qo'shilgan" },
          { key: 'open', label: '' },
        ]}
        rows={(data?.items ?? []).map((r) => ({
          name: <strong>{r.displayName}</strong>,
          login: r.login,
          phone: r.phone ?? '—',
          status: (
            <>
              <Badge status={`resident:${r.status}`}>{r.status === 'ACTIVE' ? 'Faol' : 'Bloklangan'}</Badge>{' '}
              {r.mustChangePassword ? <Badge status="flag:TEMP_PASSWORD">Vaqtinchalik parol</Badge> : null}
            </>
          ),
          createdAt: fmtDate(r.createdAt),
          open: (
            <Link href={`/residents/${r.id}`} className="btn">
              Ochish
            </Link>
          ),
        }))}
        emptyTitle={loading ? 'Yuklanmoqda…' : 'Aholi topilmadi'}
        emptyHint=""
      />
    </>
  );
}
