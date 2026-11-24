'use client';

import Link from 'next/link';
import { use, useState } from 'react';
import { Badge } from '@/components/Badge';
import { PageHeader } from '@/components/PageHeader';
import { ReasonAction } from '@/components/ReasonAction';
import { DefinitionList, Section } from '@/components/Section';
import { api } from '@/lib/api';
import { fmtDate, fmtDateTime } from '@/lib/format';
import { useAction, useFetch } from '@/lib/hooks';

interface Resident {
  id: string;
  login: string;
  displayName: string;
  phone: string | null;
  status: 'ACTIVE' | 'BLOCKED';
  blockedReason: string | null;
  mustChangePassword: boolean;
  createdAt: string;
}

// API: GET /admin/residents/:id · POST .../reset-password · POST .../block { reason } | /unblock
export default function ResidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: r, error, reload } = useFetch<Resident>(`/admin/residents/${id}`);
  const action = useAction();
  const [temp, setTemp] = useState<{ temporaryPassword: string; expiresAt: string } | null>(null);

  const resetPassword = async () => {
    const res = await action.run(() => api<{ temporaryPassword: string; expiresAt: string }>(`/admin/residents/${id}/reset-password`, { method: 'POST' }));
    if (res) {
      setTemp(res);
      await reload();
    }
  };
  const block = (reason: string) =>
    action.run(async () => {
      await api(`/admin/residents/${id}/block`, { method: 'POST', json: { reason } });
      await reload();
    });
  const unblock = () =>
    action.run(async () => {
      await api(`/admin/residents/${id}/unblock`, { method: 'POST' });
      await reload();
    });

  return (
    <>
      <PageHeader
        title={r?.displayName ?? "Aholi a'zosi"}
        description={`#${id}`}
        actions={
          <Link href="/residents" className="btn">
            Ro&apos;yxatga qaytish
          </Link>
        }
      />
      {error ? <p className="error-text">{error}</p> : null}
      {action.error ? <p className="error-text">{action.error}</p> : null}
      {r ? (
        <>
          <Section title="Ma'lumotlar">
            <DefinitionList
              items={[
                ['Ism', r.displayName],
                ['Login', r.login],
                ['Telefon', r.phone],
                ['Holat', <Badge key="s" status={`resident:${r.status}`}>{r.status === 'ACTIVE' ? 'Faol' : 'Bloklangan'}</Badge>],
                ['Bloklash sababi', r.blockedReason],
                ['Parol almashtirilishi kerak', r.mustChangePassword ? 'Ha' : "Yo'q"],
                ["Qo'shilgan", fmtDate(r.createdAt)],
              ]}
            />
          </Section>
          <Section title="Amallar">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <button type="button" className="btn" disabled={action.busy} onClick={() => void resetPassword()}>
                Parolni tiklash
              </button>
              {r.status === 'ACTIVE' ? (
                <ReasonAction label="Bloklash" danger disabled={action.busy} onSubmit={block} />
              ) : (
                <button type="button" className="btn btn-primary" disabled={action.busy} onClick={() => void unblock()}>
                  Blokdan chiqarish
                </button>
              )}
            </div>
            {temp ? (
              <p>
                Yangi vaqtinchalik parol: <code style={{ fontSize: 18 }}>{temp.temporaryPassword}</code>{' '}
                <span className="muted">(muddati: {fmtDateTime(temp.expiresAt)}; boshqa ko&apos;rsatilmaydi)</span>
              </p>
            ) : null}
          </Section>
        </>
      ) : null}
    </>
  );
}
