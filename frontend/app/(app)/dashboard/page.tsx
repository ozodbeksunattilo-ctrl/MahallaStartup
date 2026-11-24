'use client';

import Link from 'next/link';
import { useState } from 'react';
import { NavIcon } from '@/components/NavIcon';
import { PageSkeleton } from '@/components/Skeleton';
import { DefinitionList, Section } from '@/components/Section';
import { StatCard } from '@/components/StatCard';
import { fmtDate, fmtDateTime } from '@/lib/format';
import { useFetch } from '@/lib/hooks';

interface Dashboard {
  round: { id: string; periodStart: string; periodEnd: string; status: string } | null;
  activeVoters: number;
  totalResidents: number;
  pendingModeration: number;
  overdueIssues: number;
  openReports: number;
  nextEvent: { id: string; title: string; startsAt: string; location: string; rsvpCount: number } | null;
}

interface Me {
  user?: { displayName?: string };
  mahalla?: { name?: string };
}

const QUICK = [
  { href: '/moderation', label: 'Moderatsiya navbati', icon: 'shield' },
  { href: '/residents/new', label: 'Yangi aholi', icon: 'users' },
  { href: '/events/new', label: 'Yangi tadbir', icon: 'calendar' },
  { href: '/announcements/new', label: "Yangi e'lon", icon: 'megaphone' },
];

const DAY_MS = 86_400_000;

// API: GET /admin/dashboard
export default function DashboardPage() {
  const { data: d, error, loading } = useFetch<Dashboard>('/admin/dashboard');
  const { data: me } = useFetch<Me>('/me');
  const [now] = useState(() => Date.now());
  const n = (v: number | undefined) => (v === undefined ? '—' : String(v));

  if (loading && !d) return <PageSkeleton />;

  const voted = d && d.totalResidents > 0 ? Math.round((d.activeVoters / d.totalResidents) * 100) : 0;
  const daysLeft = d?.round ? Math.ceil((new Date(d.round.periodEnd).getTime() - now) / DAY_MS) : null;
  const eventDays = d?.nextEvent ? Math.ceil((new Date(d.nextEvent.startsAt).getTime() - now) / DAY_MS) : null;
  const name = me?.user?.displayName?.split(' ')[0];

  return (
    <>
      <section className="hero-card">
        <div>
          <p className="hero-eyebrow">{me?.mahalla?.name ?? 'Mahalla'}</p>
          <h1 className="hero-title">{name ? `Salom, ${name}` : 'Bosh sahifa'}</h1>
          <p className="hero-sub">Mahalla holatining qisqacha ko&apos;rinishi</p>
        </div>
        {daysLeft !== null ? (
          <div className="hero-chip">
            <NavIcon name="hourglass" size={16} />
            <span>
              {daysLeft > 0 ? `Ovoz davri tugashiga ${daysLeft} kun` : 'Ovoz davri bugun tugaydi'}
            </span>
          </div>
        ) : null}
      </section>

      <div className="quick-row">
        {QUICK.map((q) => (
          <Link key={q.href} href={q.href} className="quick-link">
            <span className="quick-ico">
              <NavIcon name={q.icon} size={18} />
            </span>
            <span>{q.label}</span>
          </Link>
        ))}
      </div>

      {error ? <p className="error-text">{error}</p> : null}

      <div className="grid-stats">
        <StatCard
          label="Faol ovoz beruvchilar"
          value={d ? `${d.activeVoters} / ${d.totalResidents}` : '—'}
          hint="Joriy davrda ovoz bergan aholi"
          href="/rounds"
          tone="green"
          icon="people"
          progress={voted}
        />
        <StatCard label="Moderatsiya kutmoqda" value={n(d?.pendingModeration)} hint="Tasdiqlanmagan muammolar" href="/moderation" tone="blue" icon="shield" />
        <StatCard
          label="Muddati o'tgan ishlar"
          value={n(d?.overdueIssues)}
          hint="Muddat yoki keyingi tekshiruv sanasi o'tgan"
          href="/issues?overdue=true"
          tone="amber"
          icon="clock"
        />
        <StatCard label="Ochiq shikoyatlar" value={n(d?.openReports)} hint="Ko'rib chiqilmagan shikoyatlar" href="/reports" tone="red" icon="alert" />
      </div>

      <div className="grid-2">
        <Section title="Joriy ovoz berish davri">
          {d?.round ? (
            <DefinitionList
              items={[
                ['Boshlanishi', fmtDate(d.round.periodStart)],
                ['Tugashi', fmtDate(d.round.periodEnd)],
                ['Holat', d.round.status === 'OPEN' ? 'Ochiq' : 'Yopilgan'],
              ]}
            />
          ) : (
            <p className="muted">Faol davr yo&apos;q.</p>
          )}
        </Section>
        <Section title="Yaqin tadbir">
          {d?.nextEvent ? (
            <>
              <DefinitionList
                items={[
                  ['Nomi', d.nextEvent.title],
                  ['Vaqti', fmtDateTime(d.nextEvent.startsAt)],
                  ['Joy', d.nextEvent.location],
                  ['Yozilganlar', String(d.nextEvent.rsvpCount)],
                ]}
              />
              <div className="event-foot">
                <Link href={`/events/${d.nextEvent.id}`} className="btn">
                  Tadbirni ochish
                </Link>
                {eventDays !== null && eventDays >= 0 ? (
                  <span className="countdown">{eventDays === 0 ? 'Bugun' : `${eventDays} kundan keyin`}</span>
                ) : null}
              </div>
            </>
          ) : (
            <p className="muted">Rejalashtirilgan tadbir yo&apos;q.</p>
          )}
        </Section>
      </div>
    </>
  );
}
