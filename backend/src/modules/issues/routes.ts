import { z } from 'zod';
import { AppError } from '../../common/app-error';
import { route } from '../../core/http';
import { uuidv7 } from '../../core/ids';
import { notify } from '../../core/notify';
import { decodeCursor, pageQuery, toPage } from '../../core/pagination';
import { idParam, text, uuid } from '../../core/schemas';
import { Params } from '../../core/sql';
import { CATEGORIES, CATEGORY_LABELS } from '../../core/types';
import { issueListItemSchema } from './dto';
import {
  PUBLIC_STATUSES,
  adminIds,
  attachMedia,
  buildIssueDetail,
  listIssues,
  recordUpdate,
  replaceIssueMedia,
  requireIssue,
  requireVisibleIssue,
} from './service';
import { checkTransition } from './status-machine';
import { issueStatusEnum } from './enums';

const IDEMPOTENCY_ERROR = {
  fields: { 'Idempotency-Key': 'Idempotency-Key header majburiy (8–100 belgi)' },
};

const categories = route({
  method: 'get',
  path: '/categories',
  auth: 'user',
  tag: 'Muammolar',
  summary: "Toifalar (o'zbekcha nomlari bilan)",
  handler: () => ({ items: CATEGORIES.map((value) => ({ value, label: CATEGORY_LABELS[value] })) }),
});

const mine = route({
  method: 'get',
  path: '/issues/mine',
  auth: 'user',
  tag: 'Muammolar',
  summary: "Mening muammolarim (hamma holatda, rad sababi va dublikat bilan)",
  query: pageQuery,
  response: z.object({ items: z.array(issueListItemSchema), nextCursor: z.string().nullable() }),
  handler: ({ deps, user, query, now }) =>
    listIssues(deps, user, now, { scope: 'mine', sort: 'newest', cursor: query.cursor, limit: query.limit }),
});

const list = route({
  method: 'get',
  path: '/issues',
  auth: 'user',
  tag: 'Muammolar',
  summary: 'Muammolar lentasi',
  description: "`period=current` — faqat joriy davrda ovoz berilayotganlar; `sort=top` — ovoz bo'yicha.",
  query: pageQuery.extend({
    category: z.enum(CATEGORIES).optional(),
    status: issueStatusEnum.optional(),
    period: z.enum(['current']).optional(),
    sort: z.enum(['newest', 'top']).default('newest'),
  }),
  response: z.object({ items: z.array(issueListItemSchema), nextCursor: z.string().nullable() }),
  handler: ({ deps, user, query, now }) =>
    listIssues(deps, user, now, {
      scope: 'public',
      category: query.category,
      status: query.status,
      periodCurrent: query.period === 'current',
      sort: query.sort,
      cursor: query.cursor,
      limit: query.limit,
    }),
});

const create = route({
  method: 'post',
  path: '/issues',
  auth: 'resident',
  tag: 'Muammolar',
  summary: 'Muammo yuborish (moderatsiyaga tushadi)',
  description: "`Idempotency-Key` header majburiy: qayta yuborish o'sha postni qaytaradi (200).",
  body: z.object({
    title: text(5, 120),
    description: text(10, 2000),
    category: z.enum(CATEGORIES),
    locationText: text(3, 200),
    mediaIds: z.array(uuid).max(4).default([]),
  }),
  limit: { name: 'issue-create', limit: 10, windowSec: 3600 },
  status: 201,
  handler: async (ctx) => {
    const { deps, user, body, now } = ctx;
    const key = ctx.req.headers['idempotency-key'];
    if (typeof key !== 'string' || key.length < 8 || key.length > 100) {
      throw new AppError('VALIDATION_ERROR', undefined, IDEMPOTENCY_ERROR);
    }

    const result = await deps.db.tx(async (q) => {
      const id = uuidv7();
      const ins = await q.query<{ id: string }>(
        `INSERT INTO issues (id, mahalla_id, author_id, title, description, category, location_text,
                             idempotency_key, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
         ON CONFLICT (author_id, idempotency_key) DO NOTHING
         RETURNING id`,
        [id, user.mahallaId, user.userId, body.title, body.description, body.category, body.locationText, key, now],
      );
      if (!ins.rows[0]) {
        const existing = await q.query<{ id: string }>(
          'SELECT id FROM issues WHERE author_id = $1 AND idempotency_key = $2',
          [user.userId, key],
        );
        return { id: (existing.rows[0] as { id: string }).id, replay: true };
      }
      await attachMedia(q, {
        mediaIds: body.mediaIds,
        ownerId: user.userId,
        mahallaId: user.mahallaId,
        target: { issueId: id },
        maxImages: 3,
        maxVideos: 1,
      });
      // TZ: muallif o'z postini avtomatik kuzatadi
      await q.query(
        'INSERT INTO issue_follows (issue_id, user_id, created_at) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [id, user.userId, now],
      );
      return { id, replay: false };
    });

    if (result.replay) ctx.status = 200;
    const issue = await requireIssue(deps.db, user.mahallaId, result.id);
    return buildIssueDetail(deps, user, issue, 'full', now);
  },
});

const detail = route({
  method: 'get',
  path: '/issues/:id',
  auth: 'user',
  tag: 'Muammolar',
  summary: "Muammo sahifasi (media URL'lar 5 daqiqalik)",
  params: idParam,
  handler: async ({ deps, user, params, now }) => {
    const { issue, vis } = await requireVisibleIssue(deps.db, user, params.id);
    return buildIssueDetail(deps, user, issue, vis, now);
  },
});

const EDITABLE = ['PENDING_REVIEW', 'REJECTED'];

const patch = route({
  method: 'patch',
  path: '/issues/:id',
  auth: 'resident',
  tag: 'Muammolar',
  summary: "Tahrirlash (faqat muallif; PENDING_REVIEW / REJECTED holatda)",
  params: idParam,
  body: z.object({
    title: text(5, 120).optional(),
    description: text(10, 2000).optional(),
    category: z.enum(CATEGORIES).optional(),
    locationText: text(3, 200).optional(),
    mediaIds: z.array(uuid).max(4).optional(),
  }),
  handler: async ({ deps, user, params, body, now }) => {
    const issue = await requireIssue(deps.db, user.mahallaId, params.id);
    if (issue.author_id !== user.userId) throw new AppError('NOT_FOUND');
    if (!EDITABLE.includes(issue.status)) {
      throw new AppError('CONFLICT', "Bu holatdagi muammoni tahrirlab bo'lmaydi");
    }
    await deps.db.tx(async (q) => {
      await q.query(
        `UPDATE issues SET title = COALESCE($2, title), description = COALESCE($3, description),
                category = COALESCE($4, category), location_text = COALESCE($5, location_text), updated_at = $6
          WHERE id = $1`,
        [issue.id, body.title ?? null, body.description ?? null, body.category ?? null, body.locationText ?? null, now],
      );
      if (body.mediaIds) {
        await replaceIssueMedia(q, {
          issueId: issue.id,
          mediaIds: body.mediaIds,
          ownerId: user.userId,
          mahallaId: user.mahallaId,
        });
      }
    });
    const fresh = await requireIssue(deps.db, user.mahallaId, issue.id);
    return buildIssueDetail(deps, user, fresh, 'full', now);
  },
});

const resubmit = route({
  method: 'post',
  path: '/issues/:id/resubmit',
  auth: 'resident',
  tag: 'Muammolar',
  summary: "Rad etilgan muammoni tahrirlab qayta yuborish (REJECTED -> PENDING_REVIEW)",
  params: idParam,
  handler: async ({ deps, user, params, now }) => {
    const issue = await requireIssue(deps.db, user.mahallaId, params.id);
    if (issue.author_id !== user.userId) throw new AppError('NOT_FOUND');
    checkTransition({ from: issue.status, to: 'PENDING_REVIEW', actor: 'AUTHOR', input: {} });
    await deps.db.tx(async (q) => {
      await q.query(
        `UPDATE issues SET status = 'PENDING_REVIEW', rejected_reason = NULL, updated_at = $2 WHERE id = $1`,
        [issue.id, now],
      );
      await recordUpdate(q, {
        issueId: issue.id,
        actorId: user.userId,
        type: 'STATUS_CHANGE',
        from: 'REJECTED',
        to: 'PENDING_REVIEW',
        reason: 'Muallif tahrirlab qayta yubordi',
        payload: { previousReason: issue.rejected_reason },
        now,
      });
    });
    const fresh = await requireIssue(deps.db, user.mahallaId, issue.id);
    return buildIssueDetail(deps, user, fresh, 'full', now);
  },
});

const remove = route({
  method: 'delete',
  path: '/issues/:id',
  auth: 'resident',
  tag: 'Muammolar',
  summary: "O'chirish (soft delete; faqat PENDING_REVIEW / REJECTED)",
  params: idParam,
  status: 204,
  handler: async ({ deps, user, params, now }) => {
    const issue = await requireIssue(deps.db, user.mahallaId, params.id);
    if (issue.author_id !== user.userId) throw new AppError('NOT_FOUND');
    if (!EDITABLE.includes(issue.status)) {
      throw new AppError('CONFLICT', "Bu holatdagi muammoni o'chirib bo'lmaydi");
    }
    await deps.db.query('UPDATE issues SET deleted_at = $2, updated_at = $2 WHERE id = $1', [issue.id, now]);
  },
});

const follow = route({
  method: 'put',
  path: '/issues/:id/follow',
  auth: 'user',
  tag: 'Muammolar',
  summary: 'Kuzatish (idempotent)',
  params: idParam,
  status: 204,
  handler: async ({ deps, user, params, now }) => {
    const { issue, vis } = await requireVisibleIssue(deps.db, user, params.id);
    if (vis !== 'full') throw new AppError('NOT_FOUND');
    await deps.db.query(
      'INSERT INTO issue_follows (issue_id, user_id, created_at) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [issue.id, user.userId, now],
    );
  },
});

const unfollow = route({
  method: 'delete',
  path: '/issues/:id/follow',
  auth: 'user',
  tag: 'Muammolar',
  summary: 'Kuzatishni bekor qilish (idempotent)',
  params: idParam,
  status: 204,
  handler: async ({ deps, user, params }) => {
    await deps.db.query('DELETE FROM issue_follows WHERE issue_id = $1 AND user_id = $2', [params.id, user.userId]);
  },
});

const feedback = route({
  method: 'post',
  path: '/issues/:id/feedback',
  auth: 'resident',
  tag: 'Muammolar',
  summary: "Muallif fikri: yakundan keyin CONFIRMED yoki STILL_ONGOING (holat o'zgarmaydi)",
  params: idParam,
  body: z.object({
    type: z.enum(['CONFIRMED', 'STILL_ONGOING']),
    comment: text(3, 1000),
    mediaIds: z.array(uuid).max(4).default([]),
  }),
  status: 201,
  handler: async ({ deps, user, params, body, now }) => {
    const issue = await requireIssue(deps.db, user.mahallaId, params.id);
    if (issue.author_id !== user.userId) throw new AppError('FORBIDDEN', 'Faqat muallif fikr bildira oladi');
    if (issue.status !== 'RESOLVED') throw new AppError('CONFLICT', "Fikr faqat hal qilingan muammoga bildiriladi");

    const updateId = await deps.db.tx(async (q) => {
      const id = await recordUpdate(q, {
        issueId: issue.id,
        actorId: user.userId,
        type: 'AUTHOR_FEEDBACK',
        reason: body.comment,
        payload: { feedback: body.type },
        now,
      });
      await attachMedia(q, {
        mediaIds: body.mediaIds,
        ownerId: user.userId,
        mahallaId: user.mahallaId,
        target: { issueUpdateId: id },
        maxImages: 3,
        maxVideos: 1,
      });
      await notify(q, {
        userIds: await adminIds(q, user.mahallaId),
        mahallaId: user.mahallaId,
        type: 'AUTHOR_FEEDBACK',
        title: body.type === 'CONFIRMED' ? 'Muallif natijani tasdiqladi' : 'Muallif: muammo hali davom etmoqda',
        body: `«${issue.title}»: ${body.comment}`,
        entityType: 'ISSUE',
        entityId: issue.id,
        dedupeKey: `issue:${issue.id}:feedback:${id}`,
      });
      return id;
    });
    return { id: updateId, issueId: issue.id, type: body.type, comment: body.comment, createdAt: now };
  },
});

// ---------------------------------------------------------------- izohlar

interface CommentRow {
  id: string;
  text: string;
  author_id: string;
  author_name: string;
  hidden_at: Date | null;
  created_at: Date;
}

const toComment = (c: CommentRow, admin: boolean) => ({
  id: c.id,
  text: c.text,
  authorId: c.author_id,
  authorName: c.author_name,
  createdAt: c.created_at,
  ...(admin ? { hidden: c.hidden_at !== null } : {}),
});

const commentCursor = z.object({ t: z.string(), id: z.uuid() });

const listComments = route({
  method: 'get',
  path: '/issues/:id/comments',
  auth: 'user',
  tag: 'Muammolar',
  summary: "Izohlar (eskisidan yangisiga)",
  params: idParam,
  query: pageQuery,
  handler: async ({ deps, user, params, query }) => {
    const { issue } = await requireVisibleIssue(deps.db, user, params.id);
    if (!(PUBLIC_STATUSES as readonly string[]).includes(issue.status)) return { items: [], nextCursor: null };
    const admin = user.role === 'MAHALLA_ADMIN';
    const p = new Params();
    const where = [`c.issue_id = ${p.add(issue.id)}`];
    if (!admin) where.push('c.hidden_at IS NULL');
    const cur = decodeCursor(query.cursor, commentCursor);
    if (cur) where.push(`(c.created_at, c.id) > (${p.add(new Date(cur.t))}, ${p.add(cur.id)})`);
    const r = await deps.db.query<CommentRow>(
      `SELECT c.id, c.text, c.author_id, u.display_name AS author_name, c.hidden_at, c.created_at
         FROM comments c JOIN users u ON u.id = c.author_id
        WHERE ${where.join(' AND ')} ORDER BY c.created_at ASC, c.id ASC LIMIT ${query.limit + 1}`,
      p.values,
    );
    const page = toPage(r.rows, query.limit, (l) => ({ t: l.created_at.toISOString(), id: l.id }));
    return { items: page.items.map((c) => toComment(c, admin)), nextCursor: page.nextCursor };
  },
});

const addComment = route({
  method: 'post',
  path: '/issues/:id/comments',
  auth: 'user',
  tag: 'Muammolar',
  summary: "Izoh qoldirish (OPEN va keyingi holatdagi ko'rinadigan postlarga)",
  params: idParam,
  body: z.object({ text: text(1, 1000) }),
  limit: { name: 'comment', limit: 30, windowSec: 60 },
  status: 201,
  handler: async ({ deps, user, params, body, now }) => {
    const { issue, vis } = await requireVisibleIssue(deps.db, user, params.id);
    if (vis !== 'full' || !(PUBLIC_STATUSES as readonly string[]).includes(issue.status)) {
      throw new AppError('CONFLICT', "Bu muammoga izoh qoldirib bo'lmaydi");
    }
    const id = uuidv7();
    await deps.db.tx(async (q) => {
      await q.query(
        'INSERT INTO comments (id, issue_id, mahalla_id, author_id, text, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
        [id, issue.id, user.mahallaId, user.userId, body.text, now],
      );
      await q.query('UPDATE issues SET comment_count = comment_count + 1 WHERE id = $1', [issue.id]);
    });
    return toComment(
      { id, text: body.text, author_id: user.userId, author_name: user.displayName, hidden_at: null, created_at: now },
      user.role === 'MAHALLA_ADMIN',
    );
  },
});

export const issueRoutes = [
  categories,
  mine,
  list,
  create,
  detail,
  patch,
  resubmit,
  remove,
  follow,
  unfollow,
  feedback,
  listComments,
  addComment,
];

