import { z } from 'zod';
import { route } from '../../core/http';
import { uuidv7 } from '../../core/ids';
import { text, uuid } from '../../core/schemas';
import { Params } from '../../core/sql';

interface MessageRow {
  id: string;
  text: string;
  sender_id: string;
  sender_name: string;
  sender_role: 'RESIDENT' | 'MAHALLA_ADMIN';
  created_at: Date;
}

export const toMessage = (m: MessageRow, meId: string) => ({
  id: m.id,
  text: m.text,
  senderId: m.sender_id,
  senderName: m.sender_name,
  senderRole: m.sender_role,
  mine: m.sender_id === meId,
  createdAt: m.created_at,
});

const history = route({
  method: 'get',
  path: '/chat/messages',
  auth: 'user',
  tag: 'Chat',
  summary: 'Chat tarixi (mahallada bitta kanal)',
  description:
    "`before=<messageId>` — eskiroq xabarlar (yangisidan eskisiga); `after=<messageId>` — uzilishdan keyin davom " +
    "(eskisidan yangisiga). `nextCursor` — keyingi so'rov uchun xabar ID'si (yo'q bo'lsa tugagan). Yashirilganlar chiqmaydi.",
  query: z.object({
    before: uuid.optional(),
    after: uuid.optional(),
    limit: z.coerce.number().int().min(1).max(100).default(30),
  }),
  handler: async ({ deps, user, query }) => {
    const p = new Params();
    const where = [`m.mahalla_id = ${p.add(user.mahallaId)}`, 'm.hidden_at IS NULL'];
    const ascending = query.after !== undefined;
    if (query.after) where.push(`m.id > ${p.add(query.after)}`);
    else if (query.before) where.push(`m.id < ${p.add(query.before)}`);

    const r = await deps.db.query<MessageRow>(
      `SELECT m.id, m.text, m.sender_id, u.display_name AS sender_name, ms.role AS sender_role, m.created_at
         FROM chat_messages m JOIN users u ON u.id = m.sender_id
         JOIN memberships ms ON ms.user_id = m.sender_id
        WHERE ${where.join(' AND ')}
        ORDER BY m.id ${ascending ? 'ASC' : 'DESC'} LIMIT ${query.limit + 1}`,
      p.values,
    );
    const more = r.rows.length > query.limit;
    const rows = r.rows.slice(0, query.limit);
    const last = rows[rows.length - 1];
    return {
      items: rows.map((m) => toMessage(m, user.userId)),
      nextCursor: more && last ? last.id : null,
    };
  },
});

const send = route({
  method: 'post',
  path: '/chat/messages',
  auth: 'user',
  tag: 'Chat',
  summary: "Xabar yuborish (idempotent: clientMessageId)",
  description: "Javobdagi `id`/`createdAt` klientga «yuborildi» holatini beradi. Realtime: Socket.IO `/chat` -> `message:new`.",
  body: z.object({
    text: text(1, 1000),
    clientMessageId: z.string().trim().min(8).max(100),
  }),
  limit: { name: 'chat', limit: 30, windowSec: 60 },
  status: 201,
  handler: async (ctx) => {
    const { deps, user, body, now } = ctx;
    const id = uuidv7();
    const ins = await deps.db.query<{ id: string }>(
      `INSERT INTO chat_messages (id, mahalla_id, sender_id, text, client_message_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (sender_id, client_message_id) DO NOTHING RETURNING id`,
      [id, user.mahallaId, user.userId, body.text, body.clientMessageId, now],
    );
    const created = ins.rows.length > 0;
    const row = await deps.db.query<MessageRow>(
      `SELECT m.id, m.text, m.sender_id, u.display_name AS sender_name, ms.role AS sender_role, m.created_at
         FROM chat_messages m JOIN users u ON u.id = m.sender_id
         JOIN memberships ms ON ms.user_id = m.sender_id
        WHERE m.sender_id = $1 AND m.client_message_id = $2`,
      [user.userId, body.clientMessageId],
    );
    const dto = toMessage(row.rows[0] as MessageRow, user.userId);
    if (created) {
      deps.realtime.emitToMahalla(user.mahallaId, 'message:new', { ...dto, mine: false });
    } else {
      ctx.status = 200;
    }
    return dto;
  },
});

export const chatRoutes = [history, send];
