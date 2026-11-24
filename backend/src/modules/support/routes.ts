import { z } from 'zod';
import { AppError } from '../../common/app-error';
import { route } from '../../core/http';
import type { Ctx } from '../../core/http';
import { uuidv7 } from '../../core/ids';
import { text, uuid } from '../../core/schemas';
import { Params } from '../../core/sql';

interface Row {
  id: string;
  text: string;
  sender_id: string;
  sender_name: string;
  sender_role: 'RESIDENT' | 'MAHALLA_ADMIN';
  created_at: Date;
}

const toMessage = (m: Row, meId: string) => ({
  id: m.id,
  text: m.text,
  senderId: m.sender_id,
  senderName: m.sender_name,
  senderRole: m.sender_role,
  mine: m.sender_id === meId,
  createdAt: m.created_at,
});

const listQuery = z.object({
  before: uuid.optional(),
  after: uuid.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

type Deps = Ctx['deps'];

async function history(deps: Deps, mahallaId: string, residentId: string, meId: string, q: z.infer<typeof listQuery>) {
  const p = new Params();
  const where = [`m.mahalla_id = ${p.add(mahallaId)}`, `m.resident_id = ${p.add(residentId)}`];
  const ascending = q.after !== undefined;
  if (q.after) where.push(`m.id > ${p.add(q.after)}`);
  else if (q.before) where.push(`m.id < ${p.add(q.before)}`);
  const r = await deps.db.query<Row>(
    `SELECT m.id, m.text, m.sender_id, u.display_name AS sender_name, ms.role AS sender_role, m.created_at
       FROM support_messages m JOIN users u ON u.id = m.sender_id
       JOIN memberships ms ON ms.user_id = m.sender_id
      WHERE ${where.join(' AND ')}
      ORDER BY m.id ${ascending ? 'ASC' : 'DESC'} LIMIT ${q.limit + 1}`,
    p.values,
  );
  const more = r.rows.length > q.limit;
  const rows = r.rows.slice(0, q.limit);
  const last = rows[rows.length - 1];
  return { items: rows.map((m) => toMessage(m, meId)), nextCursor: more && last ? last.id : null };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function insert(ctx: Ctx<any, any, any>, residentId: string, body: { text: string; clientMessageId: string }) {
  const { deps, user, now } = ctx;
  const ins = await deps.db.query(
    `INSERT INTO support_messages (id, mahalla_id, resident_id, sender_id, text, client_message_id, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (sender_id, client_message_id) DO NOTHING RETURNING id`,
    [uuidv7(), user.mahallaId, residentId, user.userId, body.text, body.clientMessageId, now],
  );
  if (ins.rows.length === 0) ctx.status = 200;
  const row = await deps.db.query<Row>(
    `SELECT m.id, m.text, m.sender_id, u.display_name AS sender_name, ms.role AS sender_role, m.created_at
       FROM support_messages m JOIN users u ON u.id = m.sender_id
       JOIN memberships ms ON ms.user_id = m.sender_id
      WHERE m.sender_id = $1 AND m.client_message_id = $2`,
    [user.userId, body.clientMessageId],
  );
  return toMessage(row.rows[0] as Row, user.userId);
}

const sendBody = z.object({ text: text(1, 1000), clientMessageId: z.string().trim().min(8).max(100) });
const threadParams = z.object({ residentId: uuid });

const myHistory = route({
  method: 'get',
  path: '/support/messages',
  auth: 'resident',
  tag: 'Support',
  summary: "Adminga yozilgan shaxsiy chat tarixi (aholining o'z suhbati)",
  description: '`before` — eskiroq (yangidan eskiga); `after` — yangilari (eskidan yangiga).',
  query: listQuery,
  handler: ({ deps, user, query }) => history(deps, user.mahallaId, user.userId, user.userId, query),
});

const mySend = route({
  method: 'post',
  path: '/support/messages',
  auth: 'resident',
  tag: 'Support',
  summary: 'Adminga xabar yuborish (idempotent: clientMessageId)',
  body: sendBody,
  limit: { name: 'support', limit: 30, windowSec: 60 },
  status: 201,
  handler: (ctx) => insert(ctx, ctx.user.userId, ctx.body),
});

const threads = route({
  method: 'get',
  path: '/admin/support/threads',
  auth: 'admin',
  tag: 'Admin: support chat',
  summary: "Aholi suhbatlari ro'yxati (oxirgi xabar bo'yicha)",
  handler: async ({ deps, user }) => {
    const r = await deps.db.query<{
      resident_id: string;
      resident_name: string;
      last_text: string;
      last_at: Date;
      last_from_resident: boolean;
    }>(
      `SELECT DISTINCT ON (m.resident_id) m.resident_id, u.display_name AS resident_name,
              m.text AS last_text, m.created_at AS last_at, (m.sender_id = m.resident_id) AS last_from_resident
         FROM support_messages m JOIN users u ON u.id = m.resident_id
        WHERE m.mahalla_id = $1
        ORDER BY m.resident_id, m.id DESC`,
      [user.mahallaId],
    );
    const items = r.rows
      .map((t) => ({
        residentId: t.resident_id,
        residentName: t.resident_name,
        lastText: t.last_text,
        lastAt: t.last_at,
        awaitingReply: t.last_from_resident,
      }))
      .sort((a, b) => +new Date(b.lastAt) - +new Date(a.lastAt));
    return { items };
  },
});

async function assertResident(deps: Deps, mahallaId: string, residentId: string) {
  const r = await deps.db.query(
    `SELECT 1 FROM memberships WHERE user_id = $1 AND mahalla_id = $2 AND role = 'RESIDENT'`,
    [residentId, mahallaId],
  );
  if (r.rows.length === 0) throw new AppError('NOT_FOUND', 'Aholi topilmadi');
}

const threadHistory = route({
  method: 'get',
  path: '/admin/support/threads/:residentId/messages',
  auth: 'admin',
  tag: 'Admin: support chat',
  summary: 'Bitta aholi bilan suhbat tarixi',
  params: threadParams,
  query: listQuery,
  handler: async ({ deps, user, params, query }) => {
    await assertResident(deps, user.mahallaId, params.residentId);
    return history(deps, user.mahallaId, params.residentId, user.userId, query);
  },
});

const threadSend = route({
  method: 'post',
  path: '/admin/support/threads/:residentId/messages',
  auth: 'admin',
  tag: 'Admin: support chat',
  summary: 'Aholiga javob yozish',
  params: threadParams,
  body: sendBody,
  limit: { name: 'support-admin', limit: 60, windowSec: 60 },
  status: 201,
  handler: async (ctx) => {
    await assertResident(ctx.deps, ctx.user.mahallaId, ctx.params.residentId);
    return insert(ctx, ctx.params.residentId, ctx.body);
  },
});

export const supportRoutes = [myHistory, mySend, threads, threadHistory, threadSend];
