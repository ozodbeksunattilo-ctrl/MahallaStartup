'use client';

import Link from 'next/link';
import { use, useState, type FormEvent } from 'react';
import { Badge } from '@/components/Badge';
import { Field } from '@/components/Field';
import { PageHeader } from '@/components/PageHeader';
import { ReasonAction } from '@/components/ReasonAction';
import { DefinitionList, Section } from '@/components/Section';
import { api } from '@/lib/api';
import { fmtDate, fmtDateTime } from '@/lib/format';
import { useAction, useFetch } from '@/lib/hooks';

interface HistoryItem {
  id: string;
  type: string;
  fromStatus: string | null;
  toStatus: string | null;
  reason: string | null;
  createdAt: string;
  actorName?: string;
}

interface IssueAdmin {
  id: string;
  title: string;
  description: string;
  categoryLabel: string;
  locationText: string;
  status: string;
  statusLabel: string;
  hidden: boolean;
  author: { id: string; displayName: string };
  createdAt: string;
  publishedAt: string | null;
  voteCount: number | null;
  commentCount: number;
  duplicateOf: { id: string; title: string } | null;
  rejectedReason: string | null;
  responsible: string | null;
  nextStep: string | null;
  dueDate: string | null;
  referredOrg: string | null;
  followUpAt: string | null;
  resolutionText: string | null;
  media: Array<{ id: string; kind: string; url: string; thumbUrl: string | null }>;
  history: HistoryItem[];
}

const WORK_STATUSES = ['SELECTED', 'IN_PROGRESS', 'REFERRED'];

// API: GET /admin/issues/:id · POST approve | reject | merge | transition | carry-over · PATCH work · POST /admin/content/POST/:id/hide|unhide
export default function AdminIssueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: i, error, loading, reload } = useFetch<IssueAdmin>(`/admin/issues/${id}`);
  const action = useAction();
  const [target, setTarget] = useState('');
  const [to, setTo] = useState('IN_PROGRESS');

  const post = (path: string, json?: unknown) =>
    action.run(async () => {
      await api(`/admin/issues/${id}${path}`, { method: 'POST', json });
      await reload();
    });

  async function transition(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const val = (k: string) => String(f.get(k) ?? '').trim() || undefined;
    await action.run(async () => {
      await api(`/admin/issues/${id}/transition`, {
        method: 'POST',
        json: {
          toStatus: to,
          responsible: val('responsible'),
          nextStep: val('nextStep'),
          dueDate: val('dueDate'),
          referredOrg: val('referredOrg'),
          referredAt: val('referredAt'),
          followUpAt: val('followUpAt'),
          resolutionText: val('resolutionText'),
        },
      });
      await reload();
    });
  }

  async function updateWork(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const val = (k: string) => String(f.get(k) ?? '').trim() || undefined;
    await action.run(async () => {
      await api(`/admin/issues/${id}/work`, {
        method: 'PATCH',
        json: { responsible: val('responsible'), nextStep: val('nextStep'), dueDate: val('dueDate'), reason: val('reason') },
      });
      await reload();
    });
  }

  const hide = (reason: string) =>
    action.run(async () => {
      await api(`/admin/content/POST/${id}/hide`, { method: 'POST', json: { reason } });
      await reload();
    });
  const unhide = () =>
    action.run(async () => {
      await api(`/admin/content/POST/${id}/unhide`, { method: 'POST' });
      await reload();
    });

  const back = (
    <Link href="/issues" className="btn">
      Ro&apos;yxatga qaytish
    </Link>
  );

  if (!i) {
    return (
      <>
        <PageHeader title="Muammo" description={`#${id}`} actions={back} />
        {error ? <p className="error-text">{error}</p> : <p className="muted">{loading ? 'Yuklanmoqda…' : ''}</p>}
      </>
    );
  }

  const canWork = ['OPEN', 'SELECTED', 'IN_PROGRESS', 'REFERRED'].includes(i.status);

  return (
    <>
      <PageHeader title={i.title} description={`#${i.id}`} actions={back} />
      {action.error ? <p className="error-text">{action.error}</p> : null}

      <div className="grid-2">
        <Section title="Asosiy ma'lumot">
          <DefinitionList
            items={[
              ['Tavsif', i.description],
              ['Toifa', i.categoryLabel],
              ['Joy', i.locationText],
              ['Muallif', i.author.displayName],
              ['Holat', <Badge key="s" status={`issue:${i.status}`}>{i.statusLabel}</Badge>],
              ['Yashirin', i.hidden ? 'Ha' : "Yo'q"],
              ['Ovozlar', i.voteCount ?? '—'],
              ['Izohlar', i.commentCount],
              ['Yuborilgan', fmtDateTime(i.createdAt)],
              ['Nashr', fmtDateTime(i.publishedAt)],
              ['Rad sababi', i.rejectedReason],
              ['Dublikat', i.duplicateOf ? <Link key="d" href={`/issues/${i.duplicateOf.id}`}>{i.duplicateOf.title}</Link> : null],
            ]}
          />
          {i.media.length ? (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
              {i.media.map((m) =>
                m.kind === 'IMAGE' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={m.id} src={m.thumbUrl ?? m.url} alt="" style={{ height: 90, borderRadius: 8 }} />
                ) : (
                  <a key={m.id} href={m.url} target="_blank" rel="noreferrer" className="btn">
                    Video
                  </a>
                ),
              )}
            </div>
          ) : null}
        </Section>

        <Section title="Ish holati">
          <DefinitionList
            items={[
              ["Mas'ul", i.responsible],
              ['Keyingi qadam', i.nextStep],
              ['Muddat', fmtDate(i.dueDate)],
              ['Tashkilot', i.referredOrg],
              ['Keyingi tekshiruv', fmtDate(i.followUpAt)],
              ['Bajarilgan ish', i.resolutionText],
            ]}
          />
        </Section>
      </div>

      {i.status === 'PENDING_REVIEW' ? (
        <Section title="Moderatsiya">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button type="button" className="btn btn-primary" disabled={action.busy} onClick={() => void post('/approve')}>
              Tasdiqlash
            </button>
            <ReasonAction label="Rad etish" danger disabled={action.busy} onSubmit={(reason) => post('/reject', { reason })} />
          </div>
          <div className="filters" style={{ marginTop: 12 }}>
            <input className="input" placeholder="Asosiy muammo ID (dublikat bo‘lsa)" value={target} onChange={(e) => setTarget(e.target.value.trim())} />
            <button type="button" className="btn" disabled={!target || action.busy} onClick={() => void post('/merge', { targetIssueId: target })}>
              Birlashtirish
            </button>
          </div>
        </Section>
      ) : null}

      {canWork ? (
        <Section title="Holatni o'tkazish">
          <form onSubmit={(e) => void transition(e)}>
            <div className="form-grid">
              <Field label="Yangi holat">
                <select className="input" value={to} onChange={(e) => setTo(e.target.value)}>
                  <option value="IN_PROGRESS">Jarayonda</option>
                  <option value="REFERRED">Tashkilotdan javob kutilmoqda</option>
                  <option value="RESOLVED">Hal qilingan</option>
                </select>
              </Field>
              {to === 'IN_PROGRESS' ? (
                <>
                  <Field label="Mas'ul">
                    <input className="input" name="responsible" required minLength={2} />
                  </Field>
                  <Field label="Keyingi qadam">
                    <input className="input" name="nextStep" required minLength={3} />
                  </Field>
                  <Field label="Muddat">
                    <input className="input" name="dueDate" type="date" required />
                  </Field>
                </>
              ) : null}
              {to === 'REFERRED' ? (
                <>
                  <Field label="Tashkilot">
                    <input className="input" name="referredOrg" required minLength={2} />
                  </Field>
                  <Field label="Yuborilgan sana">
                    <input className="input" name="referredAt" type="date" required />
                  </Field>
                  <Field label="Keyingi tekshiruv">
                    <input className="input" name="followUpAt" type="date" required />
                  </Field>
                </>
              ) : null}
              {to === 'RESOLVED' ? (
                <Field label="Bajarilgan ish" wide>
                  <textarea className="input" name="resolutionText" rows={3} required minLength={3} />
                </Field>
              ) : null}
            </div>
            <button type="submit" className="btn btn-primary" disabled={action.busy}>
              O&apos;tkazish
            </button>
          </form>
        </Section>
      ) : null}

      {WORK_STATUSES.includes(i.status) || i.status === 'IN_PROGRESS' ? (
        <Section title="Ish ma'lumotlarini o'zgartirish">
          <form onSubmit={(e) => void updateWork(e)}>
            <div className="form-grid">
              <Field label="Mas'ul">
                <input className="input" name="responsible" defaultValue={i.responsible ?? ''} />
              </Field>
              <Field label="Keyingi qadam">
                <input className="input" name="nextStep" defaultValue={i.nextStep ?? ''} />
              </Field>
              <Field label="Muddat">
                <input className="input" name="dueDate" type="date" defaultValue={i.dueDate?.slice(0, 10) ?? ''} />
              </Field>
              <Field label="O'zgartirish sababi" wide>
                <input className="input" name="reason" required minLength={3} />
              </Field>
            </div>
            <button type="submit" className="btn" disabled={action.busy}>
              Saqlash
            </button>
          </form>
        </Section>
      ) : null}

      <Section title="Boshqa amallar">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {i.hidden ? (
            <button type="button" className="btn" disabled={action.busy} onClick={() => void unhide()}>
              Yashirishni bekor qilish
            </button>
          ) : (
            <ReasonAction label="Yashirish" danger disabled={action.busy} onSubmit={hide} />
          )}
          {i.status === 'OPEN' ? (
            <button type="button" className="btn" disabled={action.busy} onClick={() => void post('/carry-over')}>
              Joriy davrga o&apos;tkazish
            </button>
          ) : null}
        </div>
      </Section>

      <Section title="Holat tarixi">
        {i.history.length === 0 ? (
          <p className="muted">Tarix bo&apos;sh.</p>
        ) : (
          <ul className="timeline">
            {i.history.map((h) => (
              <li key={h.id}>
                <strong>{h.type}</strong> {h.fromStatus ? `${h.fromStatus} → ${h.toStatus}` : (h.toStatus ?? '')}
                {h.reason ? <div className="muted">{h.reason}</div> : null}
                <div className="muted">{fmtDateTime(h.createdAt)}</div>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}
