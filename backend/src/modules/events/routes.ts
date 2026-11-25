import { z } from 'zod';
import { AppError } from '../../common/app-error';
import { audit } from '../../core/audit';
import type { Queryable } from '../../core/db';
import type { Deps } from '../../core/deps';
import { route } from '../../core/http';
import { uuidv7 } from '../../core/ids';
import { notify } from '../../core/notify';
import { decodeCursor, pageQuery, toPage } from '../../core/pagination';
import { idParam, isoDateTime, text, uuid } from '../../core/schemas';
import { Params } from '../../core/sql';
import type { AuthUser } from '../../core/types';
import { MEDIA_COLUMNS, signMedia, type MediaRow } from '../issues/dto';
import { attachMedia } from '../issues/service';

interface EventRow {
  id: string;
  title: string;
  description: string;
  starts_at: Date;
  ends_at: Date | null;
  location: string;
  organizer: string;
  status: 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';
  version: number;
  result_text: string | null;
  rsvp_count: number;
  created_at: Date;
}

const COLUMNS =
  'e.id, e.title, e.description, e.starts_at, e.ends_at, e.location, e.organizer, e.status, e.version, e.result_text, e.rsvp_count, e.created_at';

const toEvent = (e: EventRow, myRsvp: boolean) => ({
  id: e.id,
  title: e.title,
  description: e.description,
  startsAt: e.starts_at,
  endsAt: e.ends_at,
  location: e.location,
  organizer: e.organizer,
  status: e.status,
  version: e.version,
  resultText: e.result_text,
  rsvpCount: e.rsvp_count,
  myRsvp,
  createdAt: e.created_at,
});

async function findEvent(q: Queryable, user: AuthUser, id: string): Promise<EventRow> {
  const r = await q.query<EventRow>(`SELECT ${COLUMNS} FROM events e WHERE e.id = $1 AND e.mahalla_id = $2`, [
    id,
    user.mahallaId,
  ]);
  const e = r.rows[0];
  if (!e || (e.status === 'DRAFT' && user.role !== 'MAHALLA_ADMIN')) throw new AppError('NOT_FOUND');
  return e;
}

async function rsvpSet(q: Queryable, userId: string, ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const r = await q.query<{ event_id: string }>(
    'SELECT event_id FROM event_rsvps WHERE user_id = $1 AND event_id = ANY($2::uuid[])',
    [userId, `{${ids.join(',')}}`],
  );
  return new Set(r.rows.map((x) => x.event_id));
}

async function eventDetail(deps: Deps, user: AuthUser, e: EventRow, now: Date) {
  const media = await deps.db.query<MediaRow>(`SELECT ${MEDIA_COLUMNS} FROM media WHERE event_id = $1 ORDER BY created_at, id`, [
    e.id,
  ]);
  const mine = await rsvpSet(deps.db, user.userId, [e.id]);
  return { ...toEvent(e, mine.has(e.id)), media: await signMedia(deps, media.rows, now) };
}

// ---------------------------------------------------------------- aholi uchun

const cursorSchema = z.object({ t: z.string(), id: z.uuid() });

const list = route({
  method: 'get',
  path: '/events',
  auth: 'user',
  tag: 'Tadbirlar',
  summary: "Tadbirlar: kelgusi (yaqini birinchi) yoki o'tgan",
  query: pageQuery.extend({ scope: z.enum(['upcoming', 'past']).default('upcoming') }),
  handler: async ({ deps, user, query, now }) => {
    const p = new Params();
    const where = [`e.mahalla_id = ${p.add(user.mahallaId)}`, `e.status <> 'DRAFT'`];
    const nowP = p.add(now);
    const upcoming = query.scope === 'upcoming';
    where.push(
      upcoming
        ? `e.status = 'PUBLISHED' AND e.starts_at >= ${nowP}`
        : `(e.status IN ('COMPLETED', 'CANCELLED') OR (e.status = 'PUBLISHED' AND e.starts_at < ${nowP}))`,
    );
    const cur = decodeCursor(query.cursor, cursorSchema);
    if (cur) where.push(`(e.starts_at, e.id) ${upcoming ? '>' : '<'} (${p.add(new Date(cur.t))}, ${p.add(cur.id)})`);

    const r = await deps.db.query<EventRow>(
      `SELECT ${COLUMNS} FROM events e WHERE ${where.join(' AND ')}
        ORDER BY e.starts_at ${upcoming ? 'ASC' : 'DESC'}, e.id ${upcoming ? 'ASC' : 'DESC'} LIMIT ${query.limit + 1}`,
      p.values,
    );
    const page = toPage(r.rows, query.limit, (l) => ({ t: l.starts_at.toISOString(), id: l.id }));
    const mine = await rsvpSet(deps.db, user.userId, page.items.map((e) => e.id));
    return { items: page.items.map((e) => toEvent(e, mine.has(e.id))), nextCursor: page.nextCursor };
  },
});

const detail = route({
  method: 'get',
  path: '/events/:id',
  auth: 'user',
  tag: 'Tadbirlar',
  summary: 'Tadbir (natija matni va fotolar bilan)',
  params: idParam,
  handler: async ({ deps, user, params, now }) => eventDetail(deps, user, await findEvent(deps.db, user, params.id), now),
});

const rsvp = route({
  method: 'put',
  path: '/events/:id/rsvp',
  auth: 'resident',
  tag: 'Tadbirlar',
  summary: "Tadbirga yozilish (idempotent; faqat PUBLISHED va kelajakdagi tadbir)",
  params: idParam,
  handler: async ({ deps, user, params, now }) => {
    const e = await findEvent(deps.db, user, params.id);
    if (e.status !== 'PUBLISHED' || e.starts_at.getTime() <= now.getTime()) {
      throw new AppError('CONFLICT', "Bu tadbirga yozilib bo'lmaydi");
    }
    await deps.db.query(
      `WITH ins AS (
         INSERT INTO event_rsvps (event_id, user_id, created_at) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING RETURNING 1
       )
       UPDATE events SET rsvp_count = rsvp_count + (SELECT count(*)::int FROM ins) WHERE id = $1`,
      [e.id, user.userId, now],
    );
    const fresh = await findEvent(deps.db, user, e.id);
    return { going: true, rsvpCount: fresh.rsvp_count };
  },
});

const unrsvp = route({
  method: 'delete',
  path: '/events/:id/rsvp',
  auth: 'resident',
  tag: 'Tadbirlar',
  summary: "Yozilishni bekor qilish (idempotent)",
  params: idParam,
  status: 204,
  handler: async ({ deps, user, params }) => {
    const e = await findEvent(deps.db, user, params.id);
    await deps.db.query(
      `WITH del AS (DELETE FROM event_rsvps WHERE event_id = $1 AND user_id = $2 RETURNING 1)
       UPDATE events SET rsvp_count = rsvp_count - (SELECT count(*)::int FROM del) WHERE id = $1`,
      [e.id, user.userId],
    );
  },
});

// ---------------------------------------------------------------- admin

const eventBody = z.object({
  title: text(3, 150),
  description: text(10, 3000),
  startsAt: isoDateTime,
  endsAt: isoDateTime.optional(),
  location: text(3, 200),
  organizer: text(2, 150),
});

const adminList = route({
  method: 'get',
  path: '/admin/events',
  auth: 'admin',
  tag: 'Admin: tadbirlar',
  summary: "Barcha tadbirlar (qoralamalar bilan), yangisidan eskisiga",
  query: pageQuery.extend({ status: z.enum(['DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED']).optional() }),
  handler: async ({ deps, user, query }) => {
    const p = new Params();
    const where = [`e.mahalla_id = ${p.add(user.mahallaId)}`];
    if (query.status) where.push(`e.status = ${p.add(query.status)}`);
    const cur = decodeCursor(query.cursor, cursorSchema);
    if (cur) where.push(`(e.starts_at, e.id) < (${p.add(new Date(cur.t))}, ${p.add(cur.id)})`);
    const r = await deps.db.query<EventRow>(
      `SELECT ${COLUMNS} FROM events e WHERE ${where.join(' AND ')}
        ORDER BY e.starts_at DESC, e.id DESC LIMIT ${query.limit + 1}`,
      p.values,
    );
    const page = toPage(r.rows, query.limit, (l) => ({ t: l.starts_at.toISOString(), id: l.id }));
    return { items: page.items.map((e) => toEvent(e, false)), nextCursor: page.nextCursor };
  },
});

const validateTimes = (startsAt: Date, endsAt: Date | null | undefined): void => {
  if (endsAt && endsAt.getTime() <= startsAt.getTime()) {
    throw new AppError('VALIDATION_ERROR', undefined, { fields: { endsAt: "Tugash vaqti boshlanishdan keyin bo'lsin" } });
  }
};

const adminCreate = route({
  method: 'post',
  path: '/admin/events',
  auth: 'admin',
  tag: 'Admin: tadbirlar',
  summary: 'Tadbir yaratish (DRAFT)',
  body: eventBody,
  status: 201,
  handler: async ({ deps, user, body, now, req }) => {
    validateTimes(body.startsAt, body.endsAt);
    const id = uuidv7();
    await deps.db.query(
      `INSERT INTO events (id, mahalla_id, title, description, starts_at, ends_at, location, organizer, created_by_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)`,
      [id, user.mahallaId, body.title, body.description, body.startsAt, body.endsAt ?? null, body.location, body.organizer, user.userId, now],
    );
    await audit(deps.db, { mahallaId: user.mahallaId, actorId: user.userId, action: 'event.create', targetType: 'EVENT', targetId: id, ip: req.ip });
    return eventDetail(deps, user, await findEvent(deps.db, user, id), now);
  },
});

async function notifyAttendees(
  q: Queryable,
  e: Pick<EventRow, 'id' | 'title'>,
  mahallaId: string,
  type: 'EVENT_UPDATED' | 'EVENT_CANCELLED',
  title: string,
  body: string,
  dedupeKey: string,
): Promise<void> {
  const a = await q.query<{ user_id: string }>('SELECT user_id FROM event_rsvps WHERE event_id = $1', [e.id]);
  await notify(q, {
    userIds: a.rows.map((r) => r.user_id),
    mahallaId,
    type,
    title,
    body,
    entityType: 'EVENT',
    entityId: e.id,
    dedupeKey,
  });
}

const adminPatch = route({
  method: 'patch',
  path: '/admin/events/:id',
  auth: 'admin',
  tag: 'Admin: tadbirlar',
  summary: "Tahrirlash. Vaqt/joy o'zgarsa yozilganlarga bildirishnoma (version oshadi)",
  params: idParam,
  body: eventBody.partial(),
  handler: async ({ deps, user, params, body, now, req }) => {
    await deps.db.tx(async (q) => {
      const locked = await q.query('SELECT id FROM events WHERE id = $1 AND mahalla_id = $2 FOR UPDATE', [params.id, user.mahallaId]);
      if (locked.rows.length === 0) throw new AppError('NOT_FOUND');
      const e = await findEvent(q, user, params.id);
      if (e.status !== 'DRAFT' && e.status !== 'PUBLISHED') {
        throw new AppError('CONFLICT', "Yakunlangan yoki bekor qilingan tadbirni tahrirlab bo'lmaydi");
      }
      const startsAt = body.startsAt ?? e.starts_at;
      const endsAt = body.endsAt ?? e.ends_at;
      validateTimes(startsAt, endsAt);

      const scheduleChanged =
        (body.startsAt !== undefined && body.startsAt.getTime() !== e.starts_at.getTime()) ||
        (body.endsAt !== undefined && body.endsAt.getTime() !== (e.ends_at?.getTime() ?? -1)) ||
        (body.location !== undefined && body.location !== e.location);
      const bump = e.status === 'PUBLISHED' && scheduleChanged;
      const version = bump ? e.version + 1 : e.version;

      await q.query(
        `UPDATE events SET title = COALESCE($2, title), description = COALESCE($3, description),
                starts_at = $4, ends_at = $5, location = COALESCE($6, location),
                organizer = COALESCE($7, organizer), version = $8, updated_at = $9
          WHERE id = $1`,
        [e.id, body.title ?? null, body.description ?? null, startsAt, endsAt, body.location ?? null, body.organizer ?? null, version, now],
      );
      if (bump) {
        await notifyAttendees(q, e, user.mahallaId, 'EVENT_UPDATED', 'Tadbir yangilandi', `«${body.title ?? e.title}»: vaqt yoki joy o'zgardi`, `event:${e.id}:update:${version}`);
      }
      await audit(q, { mahallaId: user.mahallaId, actorId: user.userId, action: 'event.update', targetType: 'EVENT', targetId: e.id, meta: { version }, ip: req.ip });
    });
    return eventDetail(deps, user, await findEvent(deps.db, user, params.id), now);
  },
});

const adminPublish = route({
  method: 'post',
  path: '/admin/events/:id/publish',
  auth: 'admin',
  tag: 'Admin: tadbirlar',
  summary: 'Nashr qilish (idempotent)',
  params: idParam,
  handler: async ({ deps, user, params, now, req }) => {
    const e = await findEvent(deps.db, user, params.id);
    if (e.status === 'DRAFT') {
      if (e.starts_at.getTime() <= now.getTime()) {
        throw new AppError('CONFLICT', "O'tib ketgan vaqtdagi tadbirni nashr qilib bo'lmaydi");
      }
      await deps.db.query(`UPDATE events SET status = 'PUBLISHED', updated_at = $2 WHERE id = $1`, [e.id, now]);
      await audit(deps.db, { mahallaId: user.mahallaId, actorId: user.userId, action: 'event.publish', targetType: 'EVENT', targetId: e.id, ip: req.ip });
    } else if (e.status !== 'PUBLISHED') {
      throw new AppError('CONFLICT', "Bu holatdagi tadbirni nashr qilib bo'lmaydi");
    }
    return eventDetail(deps, user, await findEvent(deps.db, user, e.id), now);
  },
});

const adminCancel = route({
  method: 'post',
  path: '/admin/events/:id/cancel',
  auth: 'admin',
  tag: 'Admin: tadbirlar',
  summary: "Bekor qilish (yozilganlarga bildirishnoma; idempotent)",
  params: idParam,
  body: z.object({ reason: text(3, 500).optional() }),
  handler: async ({ deps, user, params, body, now, req }) => {
    await deps.db.tx(async (q) => {
      const locked = await q.query('SELECT id FROM events WHERE id = $1 AND mahalla_id = $2 FOR UPDATE', [params.id, user.mahallaId]);
      if (locked.rows.length === 0) throw new AppError('NOT_FOUND');
      const e = await findEvent(q, user, params.id);
      if (e.status === 'CANCELLED') return;
      if (e.status === 'COMPLETED') throw new AppError('CONFLICT', "Yakunlangan tadbirni bekor qilib bo'lmaydi");
      await q.query(`UPDATE events SET status = 'CANCELLED', version = version + 1, updated_at = $2 WHERE id = $1`, [e.id, now]);
      await notifyAttendees(q, e, user.mahallaId, 'EVENT_CANCELLED', 'Tadbir bekor qilindi', `«${e.title}» bekor qilindi${body.reason ? `: ${body.reason}` : ''}`, `event:${e.id}:cancel`);
      await audit(q, { mahallaId: user.mahallaId, actorId: user.userId, action: 'event.cancel', targetType: 'EVENT', targetId: e.id, reason: body.reason ?? null, ip: req.ip });
    });
    return eventDetail(deps, user, await findEvent(deps.db, user, params.id), now);
  },
});

const adminComplete = route({
  method: 'post',
  path: '/admin/events/:id/complete',
  auth: 'admin',
  tag: 'Admin: tadbirlar',
  summary: "Yakunlash: natija matni va foto (ixtiyoriy)",
  params: idParam,
  body: z.object({ resultText: text(3, 2000).optional(), mediaIds: z.array(uuid).max(4).default([]) }),
  handler: async ({ deps, user, params, body, now, req }) => {
    await deps.db.tx(async (q) => {
      const locked = await q.query('SELECT id FROM events WHERE id = $1 AND mahalla_id = $2 FOR UPDATE', [params.id, user.mahallaId]);
      if (locked.rows.length === 0) throw new AppError('NOT_FOUND');
      const e = await findEvent(q, user, params.id);
      if (e.status !== 'PUBLISHED' && e.status !== 'COMPLETED') {
        throw new AppError('CONFLICT', "Faqat nashr qilingan tadbirni yakunlash mumkin");
      }
      await q.query(`UPDATE events SET status = 'COMPLETED', result_text = COALESCE($2, result_text), updated_at = $3 WHERE id = $1`, [e.id, body.resultText ?? null, now]);
      await attachMedia(q, { mediaIds: body.mediaIds, ownerId: user.userId, mahallaId: user.mahallaId, target: { eventId: e.id }, maxImages: 3, maxVideos: 1 });
      await audit(q, { mahallaId: user.mahallaId, actorId: user.userId, action: 'event.complete', targetType: 'EVENT', targetId: e.id, ip: req.ip });
    });
    return eventDetail(deps, user, await findEvent(deps.db, user, params.id), now);
  },
});

const attendees = route({
  method: 'get',
  path: '/admin/events/:id/attendees',
  auth: 'admin',
  tag: 'Admin: tadbirlar',
  summary: "Yozilganlar ro'yxati",
  params: idParam,
  handler: async ({ deps, user, params }) => {
    const e = await findEvent(deps.db, user, params.id);
    const r = await deps.db.query<{ id: string; login: string; display_name: string; phone: string | null; created_at: Date }>(
      `SELECT u.id, u.login, u.display_name, u.phone, r.created_at
         FROM event_rsvps r JOIN users u ON u.id = r.user_id WHERE r.event_id = $1 ORDER BY r.created_at, u.id`,
      [e.id],
    );
    return {
      items: r.rows.map((a) => ({ id: a.id, login: a.login, displayName: a.display_name, phone: a.phone, rsvpAt: a.created_at })),
      total: r.rows.length,
    };
  },
});

export const eventRoutes = [list, detail, rsvp, unrsvp, adminList, adminCreate, adminPatch, adminPublish, adminCancel, adminComplete, attendees];

/** Job: boshlanishiga 24 soatdan kam qolgan nashr qilingan tadbirlar uchun eslatma. Idempotent (dedupeKey). */
export async function sendEventReminders(deps: Deps, now: Date): Promise<number> {
  const due = await deps.db.query<{ id: string; mahalla_id: string; title: string; starts_at: Date }>(
    `SELECT id, mahalla_id, title, starts_at FROM events
      WHERE status = 'PUBLISHED' AND starts_at > $1 AND starts_at <= $2`,
    [now, new Date(now.getTime() + 24 * 3600_000)],
  );
  let created = 0;
  for (const e of due.rows) {
    const a = await deps.db.query<{ user_id: string }>('SELECT user_id FROM event_rsvps WHERE event_id = $1', [e.id]);
    created += await notify(deps.db, {
      userIds: a.rows.map((r) => r.user_id),
      mahallaId: e.mahalla_id,
      type: 'EVENT_REMINDER',
      title: 'Tadbir eslatmasi',
      body: `«${e.title}» 24 soat ichida boshlanadi`,
      entityType: 'EVENT',
      entityId: e.id,
      // Vaqt o'zgarsa yangi eslatma, qayta ishlasa dublikat yo'q
      dedupeKey: `event:${e.id}:reminder:${e.starts_at.toISOString()}`,
    });
  }
  return created;
}
