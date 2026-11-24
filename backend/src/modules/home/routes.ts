import { route } from '../../core/http';
import { periodFor } from '../rounds/period';
import { currentRound } from '../rounds/service';
import { statusLabel } from '../issues/dto';
import type { IssueStatus } from '../../core/types';

interface Shared {
  periodEnd: string;
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
    const round = await currentRound(q, user.mahallaId, now);

    const key = `home:${user.mahallaId}:${periodFor(now).key}`;
    const cached = await deps.kv.get(key);
    let shared: Shared;
    if (cached) {
      shared = JSON.parse(cached) as Shared;
    } else {
      const [featured, ev, ann] = await Promise.all([
        q.query<{ id: string; title: string; status: IssueStatus }>(
          `SELECT id, title, status FROM issues
            WHERE mahalla_id = $1 AND deleted_at IS NULL AND hidden_at IS NULL
              AND status IN ('SELECTED', 'IN_PROGRESS', 'REFERRED', 'RESOLVED')
            ORDER BY CASE WHEN status = 'RESOLVED' THEN 1 ELSE 0 END, updated_at DESC LIMIT 1`,
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
      const e = ev.rows[0];
      const a = ann.rows[0];
      shared = {
        periodEnd: round.period_end.toISOString(),
        featuredIssue: f ? { id: f.id, title: f.title, status: f.status, statusLabel: statusLabel(f.status, false) } : null,
        nextEvent: e ? { id: e.id, title: e.title, startsAt: e.starts_at.toISOString(), location: e.location } : null,
        latestImportantAnnouncement: a ? { id: a.id, title: a.title, publishedAt: a.published_at?.toISOString() ?? null } : null,
      };
      await deps.kv.set(key, JSON.stringify(shared), 10);
    }

    const [votes, unread] = await Promise.all([
      q.query<{ n: number }>('SELECT count(*)::int AS n FROM votes WHERE round_id = $1 AND voter_id = $2', [round.id, user.userId]),
      q.query<{ n: number }>('SELECT count(*)::int AS n FROM notifications WHERE user_id = $1 AND read_at IS NULL', [user.userId]),
    ]);
    return {
      round: { periodEnd: shared.periodEnd, votesLeft: Math.max(0, 3 - (votes.rows[0]?.n ?? 0)) },
      featuredIssue: shared.featuredIssue,
      nextEvent: shared.nextEvent,
      latestImportantAnnouncement: shared.latestImportantAnnouncement,
      unreadNotifications: unread.rows[0]?.n ?? 0,
    };
  },
});

export const homeRoutes = [home];
