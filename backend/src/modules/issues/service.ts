import { z } from 'zod';
import { AppError } from '../../common/app-error';
import type { Queryable } from '../../core/db';
import type { Deps } from '../../core/deps';
import { uuidv7 } from '../../core/ids';
import { notify } from '../../core/notify';
import { decodeCursor, toPage, type Page } from '../../core/pagination';
import { Params, pgArray } from '../../core/sql';
import type { AuthUser, Category, IssueStatus } from '../../core/types';
import { currentRound, roundIsVotable } from '../rounds/service';
import {
  ISSUE_COLUMNS,
  MEDIA_COLUMNS,
  categoryLabel,
  signMedia,
  statusLabel,
  type IssueListItem,
  type IssueRow,
  type MediaRow,
} from './dto';

export type IssueWithAuthor = IssueRow & { author_name: string };

const PUBLIC_SQL = `('OPEN','SELECTED','IN_PROGRESS','REFERRED','RESOLVED')`;
export const PUBLIC_STATUSES: readonly IssueStatus[] = ['OPEN', 'SELECTED', 'IN_PROGRESS', 'REFERRED', 'RESOLVED'];

/** Toshkent sanasi (YYYY-MM-DD): «muddati o'tgan» hisobi uchun. */
export const tashkentToday = (now: Date): string => new Date(now.getTime() + 5 * 3600_000).toISOString().slice(0, 10);

// ---------------------------------------------------------------- ko'rinish qoidalari

export type Visibility = 'full' | 'hidden-notice' | 'none';

/**
 * - admin: hammasini ko'radi
 * - PENDING_REVIEW / REJECTED / MERGED: faqat muallif (va admin)
 * - yashirilgan: oddiy foydalanuvchi ko'rmaydi; muallif faqat «yashirilgan» belgisini ko'radi (media URL'siz)
 */
export function visibility(user: AuthUser, issue: Pick<IssueRow, 'author_id' | 'status' | 'hidden_at'>): Visibility {
  if (user.role === 'MAHALLA_ADMIN') return 'full';
  const isAuthor = issue.author_id === user.userId;
  const isPublic = (PUBLIC_STATUSES as readonly string[]).includes(issue.status);
  if (!isPublic && !isAuthor) return 'none';
  if (issue.hidden_at) return isAuthor ? 'hidden-notice' : 'none';
  return 'full';
}

export async function findIssue(q: Queryable, mahallaId: string, id: string): Promise<IssueWithAuthor | null> {
  const r = await q.query<IssueWithAuthor>(
    `SELECT ${ISSUE_COLUMNS}, u.display_name AS author_name
       FROM issues i JOIN users u ON u.id = i.author_id
      WHERE i.id = $1 AND i.mahalla_id = $2 AND i.deleted_at IS NULL`,
    [id, mahallaId],
  );
  return r.rows[0] ?? null;
}

/** Boshqa mahalla / mavjud emas / ko'rinmaydi -> 404 (mavjudligini oshkor qilmaymiz). */
export async function requireVisibleIssue(
  q: Queryable,
  user: AuthUser,
  id: string,
): Promise<{ issue: IssueWithAuthor; vis: Visibility }> {
  const issue = await findIssue(q, user.mahallaId, id);
  if (!issue) throw new AppError('NOT_FOUND');
  const vis = visibility(user, issue);
  if (vis === 'none') throw new AppError('NOT_FOUND');
  return { issue, vis };
}

export async function requireIssue(q: Queryable, mahallaId: string, id: string): Promise<IssueWithAuthor> {
  const issue = await findIssue(q, mahallaId, id);
  if (!issue) throw new AppError('NOT_FOUND');
  return issue;
}

// ---------------------------------------------------------------- media biriktirish

export interface AttachTarget {
  issueId?: string;
  issueUpdateId?: string;
  eventId?: string;
}

interface AttachOptions {
  mediaIds: readonly string[];
  ownerId: string;
  mahallaId: string;
  target: AttachTarget;
  maxImages: number;
  maxVideos: number;
}

/** Media egasi o'zi, hali hech narsaga bog'lanmagan va chegaralarga mos bo'lishi shart. */
export async function attachMedia(q: Queryable, o: AttachOptions): Promise<void> {
  const ids = [...new Set(o.mediaIds)];
  if (ids.length === 0) return;
  const r = await q.query<{
    id: string;
    kind: 'IMAGE' | 'VIDEO';
    issue_id: string | null;
    issue_update_id: string | null;
    event_id: string | null;
  }>(
    `SELECT id, kind, issue_id, issue_update_id, event_id FROM media
      WHERE id = ANY($1::uuid[]) AND owner_id = $2 AND mahalla_id = $3 FOR UPDATE`,
    [pgArray(ids), o.ownerId, o.mahallaId],
  );
  if (r.rows.length !== ids.length) {
    throw new AppError('VALIDATION_ERROR', undefined, { fields: { mediaIds: 'Media topilmadi' } });
  }
  if (r.rows.some((m) => m.issue_id || m.issue_update_id || m.event_id)) {
    throw new AppError('CONFLICT', 'Media allaqachon boshqa obyektga biriktirilgan', {
      fields: { mediaIds: 'Media allaqachon ishlatilgan' },
    });
  }
  const images = r.rows.filter((m) => m.kind === 'IMAGE').length;
  const videos = r.rows.length - images;
  if (images > o.maxImages || videos > o.maxVideos) {
    throw new AppError('VALIDATION_ERROR', undefined, {
      fields: { mediaIds: `Ko'pi bilan ${o.maxImages} ta rasm va ${o.maxVideos} ta video` },
    });
  }
  await q.query(
    `UPDATE media SET issue_id = $2, issue_update_id = $3, event_id = $4 WHERE id = ANY($1::uuid[])`,
    [pgArray(ids), o.target.issueId ?? null, o.target.issueUpdateId ?? null, o.target.eventId ?? null],
  );
}

/** Tahrirda media ro'yxatini to'liq almashtiradi: ro'yxatda yo'qlari ajratiladi (24 soatdan keyin tozalanadi). */
export async function replaceIssueMedia(
  q: Queryable,
  o: { issueId: string; mediaIds: readonly string[]; ownerId: string; mahallaId: string },
): Promise<void> {
  const keep = [...new Set(o.mediaIds)];
  await q.query(
    `UPDATE media SET issue_id = NULL WHERE issue_id = $1 AND NOT (id = ANY($2::uuid[]))`,
    [o.issueId, pgArray(keep)],
  );
  const already = await q.query<{ id: string }>('SELECT id FROM media WHERE issue_id = $1', [o.issueId]);
  const have = new Set(already.rows.map((m) => m.id));
  const fresh = keep.filter((id) => !have.has(id));
  const all = await q.query<{ kind: string }>('SELECT kind FROM media WHERE issue_id = $1', [o.issueId]);
  await attachMedia(q, {
    mediaIds: fresh,
    ownerId: o.ownerId,
    mahallaId: o.mahallaId,
    target: { issueId: o.issueId },
    maxImages: 3 - all.rows.filter((m) => m.kind === 'IMAGE').length,
    maxVideos: 1 - all.rows.filter((m) => m.kind === 'VIDEO').length,
  });
}

// ---------------------------------------------------------------- tarix va bildirishnoma

export interface UpdateInput {
  issueId: string;
  actorId: string | null;
  type: 'STATUS_CHANGE' | 'DETAILS_CHANGE' | 'AUTHOR_FEEDBACK' | 'CARRY_OVER';
  from?: string | null;
  to?: string | null;
  reason?: string | null;
  payload?: Record<string, unknown>;
  now: Date;
}

export async function recordUpdate(q: Queryable, u: UpdateInput): Promise<string> {
  const id = uuidv7();
  await q.query(
    `INSERT INTO issue_updates (id, issue_id, actor_id, type, from_status, to_status, reason, payload, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)`,
    [id, u.issueId, u.actorId, u.type, u.from ?? null, u.to ?? null, u.reason ?? null, JSON.stringify(u.payload ?? {}), u.now],
  );
  return id;
}

/** Muallifga va kuzatuvchilarga (harakat qilgan kishidan tashqari) bildirishnoma. */
export async function notifyIssueUpdate(
  q: Queryable,
  a: {
    issue: Pick<IssueRow, 'id' | 'mahalla_id' | 'author_id' | 'title'>;
    actorId: string | null;
    authorType: 'ISSUE_STATUS_CHANGED' | 'ISSUE_REJECTED';
    title: string;
    body: string;
    updateId: string;
  },
): Promise<void> {
  const f = await q.query<{ user_id: string }>('SELECT user_id FROM issue_follows WHERE issue_id = $1', [a.issue.id]);
  const dedupeKey = `issue:${a.issue.id}:update:${a.updateId}`;
  const base = {
    mahallaId: a.issue.mahalla_id,
    entityType: 'ISSUE' as const,
    entityId: a.issue.id,
    title: a.title,
    body: a.body,
    dedupeKey,
  };
  await notify(q, {
    ...base,
    type: a.authorType,
    userIds: [a.issue.author_id].filter((id) => id !== a.actorId),
  });
  await notify(q, {
    ...base,
    type: 'FOLLOWED_ISSUE_UPDATE',
    userIds: f.rows.map((r) => r.user_id).filter((id) => id !== a.actorId && id !== a.issue.author_id),
  });
}

export async function adminIds(q: Queryable, mahallaId: string): Promise<string[]> {
  const r = await q.query<{ user_id: string }>(
    `SELECT m.user_id FROM memberships m JOIN users u ON u.id = m.user_id
      WHERE m.mahalla_id = $1 AND m.role = 'MAHALLA_ADMIN' AND m.status = 'ACTIVE' AND u.status = 'ACTIVE'`,
    [mahallaId],
  );
  return r.rows.map((x) => x.user_id);
}

// ---------------------------------------------------------------- ro'yxat

export interface ListOptions {
  scope: 'public' | 'mine' | 'admin';
  category?: Category | undefined;
  status?: IssueStatus | undefined;
  periodCurrent?: boolean | undefined;
  roundKind?: 'MONTHLY' | 'WEEKLY' | undefined;
  sort: 'newest' | 'top';
  overdue?: boolean | undefined;
  /** Moderatsiya navbati: eng eskisi birinchi */
  oldestFirst?: boolean | undefined;
  cursor?: string | undefined;
  limit: number;
}

const listCursor = z.object({ v: z.number().int().optional(), t: z.string(), id: z.uuid() });

interface ListRow extends IssueRow {
  author_name: string;
  round_votes: number | null;
  in_round: boolean;
  duplicate_title: string | null;
  sort_at: Date;
}

/**
 * Lenta: 1 so'rov postlar + 3 ta `IN`/`ANY` so'rov (ovoz, kuzatuv, thumbnail); N+1 yo'q.
 * Har bir muammo o'z turidagi joriy davrga (oylik / haftalik) qarab hisoblanadi.
 */
export async function listIssues(
  deps: Deps,
  user: AuthUser,
  now: Date,
  o: ListOptions,
): Promise<Page<IssueListItem>> {
  const q = deps.db;
  const [monthly, weekly] = await Promise.all([
    currentRound(q, user.mahallaId, now, 'MONTHLY'),
    currentRound(q, user.mahallaId, now, 'WEEKLY'),
  ]);
  const p = new Params();

  const where = [`i.mahalla_id = ${p.add(user.mahallaId)}`, 'i.deleted_at IS NULL'];
  if (o.scope === 'public') where.push(`i.status IN ${PUBLIC_SQL}`, 'i.hidden_at IS NULL');
  if (o.scope === 'mine') where.push(`i.author_id = ${p.add(user.userId)}`);
  if (o.category) where.push(`i.category = ${p.add(o.category)}`);
  if (o.status) where.push(`i.status = ${p.add(o.status)}`);
  if (o.periodCurrent) where.push('re.id IS NOT NULL');
  if (o.roundKind) where.push(`i.round_kind = ${p.add(o.roundKind)}`);
  if (o.overdue) {
    const today = p.add(tashkentToday(now));
    where.push(
      `i.status IN ('IN_PROGRESS','REFERRED')`,
      `(i.due_date < ${today}::date OR i.follow_up_at < ${today}::date)`,
    );
  }

  const sortExpr = 'COALESCE(i.published_at, i.created_at)';
  const top = o.sort === 'top';
  const cur = decodeCursor(o.cursor, listCursor);
  if (cur) {
    if (o.oldestFirst) {
      where.push(`(${sortExpr}, i.id) > (${p.add(new Date(cur.t))}, ${p.add(cur.id)})`);
    } else if (top) {
      where.push(
        `(COALESCE(re.vote_count, 0), ${sortExpr}, i.id) < (${p.add(cur.v ?? 0)}, ${p.add(new Date(cur.t))}, ${p.add(cur.id)})`,
      );
    } else {
      where.push(`(${sortExpr}, i.id) < (${p.add(new Date(cur.t))}, ${p.add(cur.id)})`);
    }
  }

  const roundParam = `(CASE WHEN i.round_kind = 'WEEKLY' THEN ${p.add(weekly.id)}::uuid ELSE ${p.add(monthly.id)}::uuid END)`;
  const order = o.oldestFirst
    ? `${sortExpr} ASC, i.id ASC`
    : `${top ? 'COALESCE(re.vote_count, 0) DESC, ' : ''}${sortExpr} DESC, i.id DESC`;

  const r = await q.query<ListRow>(
    `SELECT ${ISSUE_COLUMNS}, u.display_name AS author_name, re.vote_count AS round_votes,
            (re.id IS NOT NULL) AS in_round, d.title AS duplicate_title, ${sortExpr} AS sort_at
       FROM issues i
       JOIN users u ON u.id = i.author_id
       LEFT JOIN round_entries re ON re.issue_id = i.id AND re.round_id = ${roundParam}
       LEFT JOIN issues d ON d.id = i.duplicate_of_id
      WHERE ${where.join(' AND ')}
      ORDER BY ${order}
      LIMIT ${o.limit + 1}`,
    p.values,
  );

  const rows = r.rows.slice(0, o.limit);
  const ids = rows.map((x) => x.id);
  const [votes, follows, thumbs] = ids.length
    ? await Promise.all([
        q.query<{ issue_id: string }>(
          'SELECT issue_id FROM votes WHERE round_id = ANY($1::uuid[]) AND voter_id = $2 AND issue_id = ANY($3::uuid[])',
          [pgArray([monthly.id, weekly.id]), user.userId, pgArray(ids)],
        ),
        q.query<{ issue_id: string }>(
          'SELECT issue_id FROM issue_follows WHERE user_id = $1 AND issue_id = ANY($2::uuid[])',
          [user.userId, pgArray(ids)],
        ),
        q.query<{ issue_id: string; thumb_key: string }>(
          `SELECT DISTINCT ON (issue_id) issue_id, thumb_key FROM media
            WHERE issue_id = ANY($1::uuid[]) AND kind = 'IMAGE' AND thumb_key IS NOT NULL
            ORDER BY issue_id, created_at, id`,
          [pgArray(ids)],
        ),
      ])
    : [{ rows: [] }, { rows: [] }, { rows: [] }];
  const voted = new Set(votes.rows.map((x) => x.issue_id));
  const followed = new Set(follows.rows.map((x) => x.issue_id));
  const thumbKey = new Map(thumbs.rows.map((x) => [x.issue_id, x.thumb_key]));

  const items: IssueListItem[] = await Promise.all(
    rows.map(async (row) => {
      const hidden = row.hidden_at !== null;
      // Yashirilgan postning media URL'i faqat adminga beriladi
      const mayShowMedia = !hidden || user.role === 'MAHALLA_ADMIN';
      const key = thumbKey.get(row.id);
      return {
        id: row.id,
        title: row.title,
        category: row.category,
        categoryLabel: categoryLabel(row.category),
        locationText: row.location_text,
        status: row.status,
        statusLabel: statusLabel(row.status, row.in_round),
        publishedAt: row.published_at,
        createdAt: row.created_at,
        commentCount: row.comment_count,
        voteCount: row.in_round ? (row.round_votes ?? 0) : null,
        myVote: voted.has(row.id),
        roundKind: row.round_kind,
        isFollowing: followed.has(row.id),
        thumbUrl: key && mayShowMedia ? await deps.storage.signedUrl(key, 300, now) : null,
        authorName: row.author_name,
        responsible: row.responsible,
        dueDate: row.due_date,
        hidden,
        rejectedReason: row.status === 'REJECTED' ? row.rejected_reason : null,
        duplicateOf: row.duplicate_of_id ? { id: row.duplicate_of_id, title: row.duplicate_title ?? '' } : null,
      };
    }),
  );

  const page = toPage(r.rows, o.limit, (last) => ({
    ...(top && !o.oldestFirst ? { v: last.in_round ? (last.round_votes ?? 0) : 0 } : {}),
    t: last.sort_at.toISOString(),
    id: last.id,
  }));
  return { items, nextCursor: page.nextCursor };
}

// ---------------------------------------------------------------- batafsil

export async function buildIssueDetail(
  deps: Deps,
  user: AuthUser,
  issue: IssueWithAuthor,
  vis: Visibility,
  now: Date,
) {
  const q = deps.db;
  const isAdmin = user.role === 'MAHALLA_ADMIN';
  // Muammo o'z turidagi joriy davrda ovozga chiqadi (oylik yoki haftalik)
  const round = await currentRound(q, user.mahallaId, now, issue.round_kind);

  const [entry, latest, mine, follow, dup] = await Promise.all([
    q.query<{ vote_count: number }>('SELECT vote_count FROM round_entries WHERE round_id = $1 AND issue_id = $2', [
      round.id,
      issue.id,
    ]),
    q.query<{ vote_count: number; round_id: string }>(
      `SELECT re.vote_count, re.round_id FROM round_entries re JOIN voting_rounds vr ON vr.id = re.round_id
        WHERE re.issue_id = $1 ORDER BY vr.period_start DESC LIMIT 1`,
      [issue.id],
    ),
    q.query<{ issue_id: string }>('SELECT issue_id FROM votes WHERE round_id = $1 AND voter_id = $2', [
      round.id,
      user.userId,
    ]),
    q.query('SELECT 1 FROM issue_follows WHERE issue_id = $1 AND user_id = $2', [issue.id, user.userId]),
    issue.duplicate_of_id
      ? q.query<{ id: string; title: string }>('SELECT id, title FROM issues WHERE id = $1', [issue.duplicate_of_id])
      : Promise.resolve({ rows: [] as { id: string; title: string }[] }),
  ]);

  const inRound = entry.rows.length > 0;
  const myVote = mine.rows.some((v) => v.issue_id === issue.id);
  const votesUsed = mine.rows.length;
  const base = {
    id: issue.id,
    title: issue.title,
    category: issue.category,
    categoryLabel: categoryLabel(issue.category),
    status: issue.status,
    statusLabel: statusLabel(issue.status, inRound),
    hidden: issue.hidden_at !== null,
    author: { id: issue.author_id, displayName: issue.author_name },
    createdAt: issue.created_at,
    publishedAt: issue.published_at,
    roundKind: issue.round_kind,
  };

  if (vis === 'hidden-notice') {
    // Muallif o'z yashirilgan postini faqat «yashirilgan» belgisi bilan ko'radi
    return { ...base, hidden: true, hiddenNotice: 'Bu post moderator tomonidan yashirilgan' };
  }

  const [mediaRes, historyRes] = await Promise.all([
    q.query<MediaRow>(
      `SELECT ${MEDIA_COLUMNS} FROM media
        WHERE issue_id = $1 OR issue_update_id IN (SELECT id FROM issue_updates WHERE issue_id = $1)
        ORDER BY created_at, id`,
      [issue.id],
    ),
    q.query<{
      id: string;
      type: string;
      from_status: string | null;
      to_status: string | null;
      reason: string | null;
      payload: Record<string, unknown>;
      created_at: Date;
      actor_name: string | null;
    }>(
      `SELECT uu.id, uu.type, uu.from_status, uu.to_status, uu.reason, uu.payload, uu.created_at,
              a.display_name AS actor_name
         FROM issue_updates uu LEFT JOIN users a ON a.id = uu.actor_id
        WHERE uu.issue_id = $1 ORDER BY uu.created_at, uu.id`,
      [issue.id],
    ),
  ]);

  const issueMedia = mediaRes.rows.filter((m) => m.issue_update_id === null);
  const signedAll = await signMedia(deps, mediaRes.rows, now);
  const signedById = new Map(signedAll.map((m) => [m.id, m]));
  const mediaByUpdate = new Map<string, string[]>();
  for (const m of mediaRes.rows) {
    if (m.issue_update_id) mediaByUpdate.set(m.issue_update_id, [...(mediaByUpdate.get(m.issue_update_id) ?? []), m.id]);
  }

  const votable = issue.status === 'OPEN' && inRound && roundIsVotable(round, now) && !issue.hidden_at;
  return {
    ...base,
    description: issue.description,
    locationText: issue.location_text,
    media: issueMedia.map((m) => signedById.get(m.id)).filter((m) => m !== undefined),
    voteCount: inRound ? (entry.rows[0]?.vote_count ?? 0) : (latest.rows[0]?.vote_count ?? null),
    roundId: inRound ? round.id : (latest.rows[0]?.round_id ?? null),
    myVote,
    isFollowing: follow.rows.length > 0,
    canVote: user.role === 'RESIDENT' && votable && !myVote && votesUsed < 3,
    commentCount: issue.comment_count,
    duplicateOf: dup.rows[0] ?? null,
    rejectedReason: issue.status === 'REJECTED' ? issue.rejected_reason : null,
    responsible: issue.responsible,
    nextStep: issue.next_step,
    dueDate: issue.due_date,
    referredOrg: issue.referred_org,
    referredAt: issue.referred_at,
    followUpAt: issue.follow_up_at,
    resolutionText: issue.resolution_text,
    hiddenReason: isAdmin ? issue.hidden_reason : null,
    history: historyRes.rows.map((h) => ({
      id: h.id,
      type: h.type,
      fromStatus: h.from_status,
      toStatus: h.to_status,
      reason: h.reason,
      payload: h.payload,
      createdAt: h.created_at,
      actorName: isAdmin ? h.actor_name : null,
      media: (mediaByUpdate.get(h.id) ?? []).map((id) => signedById.get(id)).filter((m) => m !== undefined),
    })),
  };
}
