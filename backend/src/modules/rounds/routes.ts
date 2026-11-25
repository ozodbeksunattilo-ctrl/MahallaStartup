import { z } from 'zod';
import { AppError } from '../../common/app-error';
import type { Db } from '../../core/db';
import type { Deps } from '../../core/deps';
import { route } from '../../core/http';
import { decodeCursor, pageQuery, toPage } from '../../core/pagination';
import { idParam } from '../../core/schemas';
import { Params } from '../../core/sql';
import type { AuthUser } from '../../core/types';
import { periodForKind, type RoundKind } from './period';
import { castVote, currentRound, loadRoundResult, removeVote } from './service';

const vote = route({
  method: 'put',
  path: '/issues/:id/vote',
  auth: 'resident',
  tag: 'Ovoz',
  summary: 'Ovoz berish (idempotent; 4-ovoz -> 409 VOTE_LIMIT_REACHED)',
  description:
    "Serverda tekshiriladi: davr ochiq va tugamagan, post shu davrda va OPEN, yashirilmagan. " +
    "Xatolar: ROUND_CLOSED, ISSUE_NOT_VOTABLE, VOTE_LIMIT_REACHED. Allaqachon ovoz bergan bo'lsa 200 va o'sha holat.",
  params: idParam,
  handler: ({ deps, user, params, now }) => castVote(deps, user, params.id, now),
});

const unvote = route({
  method: 'delete',
  path: '/issues/:id/vote',
  auth: 'resident',
  tag: 'Ovoz',
  summary: "Ovozni qaytarib olish (ovoz yo'q bo'lsa ham 204)",
  params: idParam,
  status: 204,
  handler: async ({ deps, user, params, now }) => {
    await removeVote(deps, user, params.id, now);
  },
});

/** Bitta tur bo'yicha joriy davr holati: davr, ishlatilgan/qolgan ovozlar va mening ovozlarim. */
async function currentState(deps: Deps, user: AuthUser, now: Date, kind: RoundKind) {
  // Mahalla bo'yicha umumiy qism 10 s keshlanadi (kalitda davr bor: davr almashganda eskirmaydi)
  const key = `round:current:${user.mahallaId}:${periodForKind(kind, now).key}`;
  let shared = await deps.kv.get(key).then((v) => (v ? (JSON.parse(v) as Record<string, unknown>) : null));
  if (!shared) {
    const r = await currentRound(deps.db, user.mahallaId, now, kind);
    shared = { id: r.id, kind: r.kind, status: r.status, periodStart: r.period_start, periodEnd: r.period_end };
    await deps.kv.set(key, JSON.stringify(shared), 10);
  }
  const mine = await deps.db.query<{ issue_id: string; slot: number; title: string }>(
    `SELECT v.issue_id, v.slot, i.title FROM votes v JOIN issues i ON i.id = v.issue_id
      WHERE v.round_id = $1 AND v.voter_id = $2 ORDER BY v.slot`,
    [shared['id'], user.userId],
  );
  return {
    round: shared,
    periodStart: shared['periodStart'],
    periodEnd: shared['periodEnd'],
    votesUsed: mine.rows.length,
    votesLeft: Math.max(0, 3 - mine.rows.length),
    myVotes: mine.rows.map((v) => ({ issueId: v.issue_id, title: v.title, slot: v.slot })),
  };
}

const current = route({
  method: 'get',
  path: '/rounds/current',
  auth: 'user',
  tag: 'Ovoz',
  summary: 'Joriy davr, ishlatilgan/qolgan ovozlar va mening ovozlarim',
  description:
    "Yuqori darajadagi maydonlar — oylik davr (orqaga moslik). `weekly` — parallel ishlaydigan haftalik davr " +
    "(dushanba–dushanba, Toshkent vaqti); har bir davrda alohida 3 tadan ovoz.",
  handler: async ({ deps, user, now }) => {
    const [monthly, weekly] = await Promise.all([
      currentState(deps, user, now, 'MONTHLY'),
      currentState(deps, user, now, 'WEEKLY'),
    ]);
    return { ...monthly, weekly };
  },
});

const cursorSchema = z.object({ t: z.string() });
const roundsQuery = pageQuery.extend({ kind: z.enum(['MONTHLY', 'WEEKLY']).optional() });

async function listRounds(
  deps: { db: Db },
  user: AuthUser,
  query: { cursor?: string | undefined; limit: number; kind?: RoundKind | undefined },
) {
  const p = new Params();
  const where = [`vr.mahalla_id = ${p.add(user.mahallaId)}`];
  if (query.kind) where.push(`vr.kind = ${p.add(query.kind)}`);
  const cur = decodeCursor(query.cursor, cursorSchema);
  if (cur) where.push(`vr.period_start < ${p.add(new Date(cur.t))}`);
  const r = await deps.db.query<{
    id: string;
    kind: RoundKind;
    period_start: Date;
    period_end: Date;
    status: 'OPEN' | 'CLOSED';
    winner_issue_id: string | null;
    total_voters: number | null;
    total_votes: number | null;
    snapshot: { title: string; votes: number }[] | null;
  }>(
    `SELECT vr.id, vr.kind, vr.period_start, vr.period_end, vr.status, rr.winner_issue_id, rr.total_voters, rr.total_votes, rr.snapshot
       FROM voting_rounds vr LEFT JOIN round_results rr ON rr.round_id = vr.id
      WHERE ${where.join(' AND ')} ORDER BY vr.period_start DESC LIMIT ${query.limit + 1}`,
    p.values,
  );
  const page = toPage(r.rows, query.limit, (l) => ({ t: l.period_start.toISOString() }));
  return {
    items: page.items.map((x) => ({
      id: x.id,
      kind: x.kind,
      periodStart: x.period_start,
      periodEnd: x.period_end,
      status: x.status,
      winner: x.winner_issue_id && x.snapshot?.[0] ? { issueId: x.winner_issue_id, title: x.snapshot[0].title, votes: x.snapshot[0].votes } : null,
      totalVoters: x.total_voters,
      totalVotes: x.total_votes,
    })),
    nextCursor: page.nextCursor,
  };
}

async function roundResult(deps: { db: Db }, user: AuthUser, id: string) {
  const owned = await deps.db.query('SELECT 1 FROM voting_rounds WHERE id = $1 AND mahalla_id = $2', [id, user.mahallaId]);
  if (owned.rows.length === 0) throw new AppError('NOT_FOUND');
  const result = await loadRoundResult(deps.db, id);
  if (!result) throw new AppError('NOT_FOUND', 'Natija hali tayyor emas');
  return result;
}

const list = route({
  method: 'get',
  path: '/rounds',
  auth: 'user',
  tag: 'Ovoz',
  summary: "Davrlar ro'yxati (yangisidan eskisiga)",
  description: "`kind` — faqat oylik yoki haftalik davrlar; berilmasa ikkalasi aralash.",
  query: roundsQuery,
  handler: ({ deps, user, query }) => listRounds(deps, user, query),
});

const result = route({
  method: 'get',
  path: '/rounds/:id/result',
  auth: 'user',
  tag: 'Ovoz',
  summary: "Davr natijasi: g'olib, reyting, ovoz berganlar soni",
  params: idParam,
  handler: ({ deps, user, params }) => roundResult(deps, user, params.id),
});

const adminList = route({
  method: 'get',
  path: '/admin/rounds',
  auth: 'admin',
  tag: 'Admin: davrlar',
  summary: "Davrlar ro'yxati",
  query: roundsQuery,
  handler: ({ deps, user, query }) => listRounds(deps, user, query),
});

const adminResult = route({
  method: 'get',
  path: '/admin/rounds/:id/result',
  auth: 'admin',
  tag: 'Admin: davrlar',
  summary: "Davr natijasi (g'olibni almashtirish endpointi ataylab YO'Q)",
  params: idParam,
  handler: ({ deps, user, params }) => roundResult(deps, user, params.id),
});

// `/rounds/current` parametrli `/rounds/:id/result` bilan to'qnashmaydi (boshqa uzunlik), lekin tartibni saqlaymiz
export const roundRoutes = [current, list, result, vote, unvote, adminList, adminResult];
