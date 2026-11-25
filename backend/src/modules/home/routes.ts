import { route } from '../../core/http';
import { periodFor, weekPeriodFor } from '../rounds/period';
import { currentRound } from '../rounds/service';
import { statusLabel } from '../issues/dto';
import type { IssueStatus } from '../../core/types';

interface Shared {
  periodEnd: string;
  weeklyPeriodEnd: string;
  weeklyIssue: { id: string; title: string; status: IssueStatus; statusLabel: string; dueDate: string | null } | null;
  featuredIssue: { id: string; title: string; status: IssueStatus; statusLabel: string } | null;
  nextEvent: { id: string; title: string; startsAt: string; location: string } | null;
  latestImportantAnnouncement: { id: string; title: string; publishedAt: string | null } | null;
}

const home = route({
  method: 'get',
  path: '/home',
  auth: 'user',
  tag: 'Bosh sahifa',
  summary: "Mobil bosh sahifa: bitta so'rovda hammasi",
  description: "Mahalla bo'yicha umumiy qism 10 s keshlanadi; ovozlar va o'qilmaganlar foydalanuvchiga xos.",
  handler: async ({ deps, user, now }) => {
    const q = deps.db;
    const [round, weekly] = await Promise.all([
      currentRound(q, user.mahallaId, now, 'MONTHLY'),
      currentRound(q, user.mahallaId, now, 'WEEKLY'),
    ]);

    const key = `home:${user.mahallaId}:${periodFor(now).key}:${weekPeriodFor(now).key}`;
    const cached = await deps.kv.get(key);
    let shared: Shared;
    if (cached) {
      shared = JSON.parse(cached) as Shared;
    } else {
      const [featured, weeklyWin, ev, ann] = await Promise.all([
        q.query<{ id: string; title: string; status: IssueStatus }>(
          `SELECT id, title, status FROM issues
            WHERE mahalla_id = $1 AND deleted_at IS NULL AND hidden_at IS NULL AND round_kind = 'MONTHLY'
              AND status IN ('SELECTED', 'IN_PROGRESS', 'REFERRED', 'RESOLVED')
            ORDER BY CASE WHEN status = 'RESOLVED' THEN 1 ELSE 0 END, updated_at DESC LIMIT 1`,
          [user.mahallaId],
        ),
        // Haftaning muammosi: oxirgi haftalik g'olib, hali hal qilinmagan bo'lsa (1 hafta muddat bilan)
        q.query<{ id: string; title: string; status: IssueStatus; due_date: string | null }>(
          `SELECT id, title, status, due_date::text AS due_date FROM issues
            WHERE mahalla_id = $1 AND deleted_at IS NULL AND hidden_at IS NULL AND round_kind = 'WEEKLY'
              AND status IN ('SELECTED', 'IN_PROGRESS', 'REFERRED')
            ORDER BY updated_at DESC LIMIT 1`,
          [user.mahallaId],
        ),
        q.query<{ id: string; title: string; starts_at: Date; location: string }>(
          `SELECT id, title, starts_at, location FROM events
            WHERE mahalla_id = $1 AND status = 'PUBLISHED' AND starts_at >= $2 ORDER BY starts_at LIMIT 1`,
          [user.mahallaId, now],
        ),
        q.query<{ id: string; title: string; published_at: Date | null }>(
          `SELECT id, title, published_at FROM announcements
            WHERE mahalla_id = $1 AND status = 'PUBLISHED' AND is_important
            ORDER BY published_at DESC LIMIT 1`,
          [user.mahallaId],
        ),
      ]);
      const f = featured.rows[0];
      const wi = weeklyWin.rows[0];
      const e = ev.rows[0];
      const a = ann.rows[0];
      shared = {
        periodEnd: round.period_end.toISOString(),
        weeklyPeriodEnd: weekly.period_end.toISOString(),
        weeklyIssue: wi
          ? { id: wi.id, title: wi.title, status: wi.status, statusLabel: statusLabel(wi.status, false), dueDate: wi.due_date }
          : null,
        featuredIssue: f ? { id: f.id, title: f.title, status: f.status, statusLabel: statusLabel(f.status, false) } : null,
        nextEvent: e ? { id: e.id, title: e.title, startsAt: e.starts_at.toISOString(), location: e.location } : null,
        latestImportantAnnouncement: a ? { id: a.id, title: a.title, publishedAt: a.published_at?.toISOString() ?? null } : null,
      };
      await deps.kv.set(key, JSON.stringify(shared), 10);
    }

    const [votes, weeklyVotes, unread] = await Promise.all([
      q.query<{ n: number }>('SELECT count(*)::int AS n FROM votes WHERE round_id = $1 AND voter_id = $2', [round.id, user.userId]),
      q.query<{ n: number }>('SELECT count(*)::int AS n FROM votes WHERE round_id = $1 AND voter_id = $2', [weekly.id, user.userId]),
      q.query<{ n: number }>('SELECT count(*)::int AS n FROM notifications WHERE user_id = $1 AND read_at IS NULL', [user.userId]),
    ]);
    return {
      round: { periodEnd: shared.periodEnd, votesLeft: Math.max(0, 3 - (votes.rows[0]?.n ?? 0)) },
      weeklyRound: { periodEnd: shared.weeklyPeriodEnd, votesLeft: Math.max(0, 3 - (weeklyVotes.rows[0]?.n ?? 0)) },
      weeklyIssue: shared.weeklyIssue,
      featuredIssue: shared.featuredIssue,
      nextEvent: shared.nextEvent,
      latestImportantAnnouncement: shared.latestImportantAnnouncement,
      unreadNotifications: unread.rows[0]?.n ?? 0,
    };
  },
});

export const homeRoutes = [home];
