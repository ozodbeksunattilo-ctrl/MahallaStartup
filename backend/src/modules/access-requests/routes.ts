import { z } from 'zod';
import { AppError } from '../../common/app-error';
import { audit } from '../../core/audit';
import { route } from '../../core/http';
import { uuidv7 } from '../../core/ids';
import { decodeCursor, pageQuery, toPage } from '../../core/pagination';
import { generateTempPassword, hashPassword } from '../../core/password';
import { idParam, loginSchema, text } from '../../core/schemas';
import { escapeLike, isUniqueViolation, Params } from '../../core/sql';
import { rateLimit } from '../../middleware/rate-limit';

const TEMP_PASSWORD_TTL_MS = 72 * 3600_000;
const TAG = "Admin: kirish so'rovlari";

interface RequestRow {
  id: string;
  full_name: string;
  phone: string;
  address: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  note: string | null;
  user_id: string | null;
  created_at: Date;
  decided_at: Date | null;
}

const COLUMNS = 'id, full_name, phone, address, status, note, user_id, created_at, decided_at';

const toRequest = (r: RequestRow) => ({
  id: r.id,
  fullName: r.full_name,
  phone: r.phone,
  address: r.address,
  status: r.status,
  note: r.note,
  userId: r.user_id,
  createdAt: r.created_at,
  decidedAt: r.decided_at,
});

const create = route({
  method: 'post',
  path: '/auth/access-requests',
  auth: 'public',
  tag: 'Auth',
  summary: "Kirish so'rovi (mobil «Ro'yxatdan o'tish»; akkauntni mahalla admini beradi)",
  body: z.object({
    fullName: text(3, 100),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9 ()-]{9,32}$/, "Telefon raqami noto'g'ri"),
    mahallaName: text(2, 100),
    address: z.string().trim().max(200).optional(),
  }),
  status: 201,
  handler: async ({ deps, body, req, now }) => {
    await rateLimit(deps, { name: 'access-request-ip', limit: 5, windowSec: 3600, key: req.ip ?? 'unknown' });

    const m = await deps.db.query<{ id: string }>(
      `SELECT id FROM mahalla WHERE name ILIKE $1 OR slug = lower($2) ORDER BY name LIMIT 1`,
      [`%${escapeLike(body.mahallaName)}%`, body.mahallaName],
    );
    const mahalla = m.rows[0];
    if (!mahalla) {
      throw new AppError('VALIDATION_ERROR', undefined, { fields: { mahallaName: 'Bunday mahalla topilmadi' } });
    }
    const dup = await deps.db.query(
      `SELECT 1 FROM access_requests WHERE mahalla_id = $1 AND phone = $2 AND status = 'PENDING'`,
      [mahalla.id, body.phone],
    );
    if (dup.rows.length > 0) throw new AppError('CONFLICT', "Bu raqamdan so'rov allaqachon yuborilgan");

    const id = uuidv7();
    await deps.db.query(
      `INSERT INTO access_requests (id, mahalla_id, full_name, phone, address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, mahalla.id, body.fullName, body.phone, body.address || null, now],
    );
    return { id, status: 'PENDING' };
  },
});

const cursorSchema = z.object({ at: z.string(), id: z.uuid() });

const list = route({
  method: 'get',
  path: '/admin/access-requests',
  auth: 'admin',
  tag: TAG,
  summary: "Kirish so'rovlari ro'yxati",
  query: pageQuery.extend({ status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional() }),
  handler: async ({ deps, user, query }) => {
    const p = new Params();
    const where = [`mahalla_id = ${p.add(user.mahallaId)}`];
    if (query.status) where.push(`status = ${p.add(query.status)}`);
    const cur = decodeCursor(query.cursor, cursorSchema);
    if (cur) where.push(`(created_at, id) < (${p.add(new Date(cur.at))}, ${p.add(cur.id)})`);
    const r = await deps.db.query<RequestRow>(
      `SELECT ${COLUMNS} FROM access_requests WHERE ${where.join(' AND ')}
        ORDER BY created_at DESC, id DESC LIMIT ${query.limit + 1}`,
      p.values,
    );
    const page = toPage(r.rows, query.limit, (last) => ({ at: last.created_at.toISOString(), id: last.id }));
    return { items: page.items.map(toRequest), nextCursor: page.nextCursor };
  },
});

const approve = route({
  method: 'post',
  path: '/admin/access-requests/:id/approve',
  auth: 'admin',
  tag: TAG,
  summary: "So'rovni tasdiqlash: akkaunt yaratiladi, vaqtinchalik parol bir marta qaytadi",
  params: idParam,
  body: z.object({ login: loginSchema }),
  handler: async ({ deps, user, params, body, now, req }) => {
    const temporaryPassword = generateTempPassword();
    const hash = await hashPassword(temporaryPassword);
    const expiresAt = new Date(now.getTime() + TEMP_PASSWORD_TTL_MS);
    const userId = uuidv7();
    try {
      await deps.db.tx(async (q) => {
        const r = await q.query<RequestRow>(
          `SELECT ${COLUMNS} FROM access_requests WHERE id = $1 AND mahalla_id = $2 FOR UPDATE`,
          [params.id, user.mahallaId],
        );
        const row = r.rows[0];
        if (!row) throw new AppError('NOT_FOUND');
        if (row.status !== 'PENDING') throw new AppError('CONFLICT', "So'rov allaqachon ko'rib chiqilgan");

        await q.query(
          `INSERT INTO users (id, login, display_name, phone, password_hash, must_change_password, temp_password_expires_at, created_at)
           VALUES ($1, $2, $3, $4, $5, true, $6, $7)`,
          [userId, body.login, row.full_name, row.phone, hash, expiresAt, now],
        );
        await q.query(
          `INSERT INTO memberships (id, user_id, mahalla_id, role, created_at) VALUES ($1, $2, $3, 'RESIDENT', $4)`,
          [uuidv7(), userId, user.mahallaId, now],
        );
        await q.query(
          `UPDATE access_requests SET status = 'APPROVED', user_id = $2, decided_at = $3, decided_by = $4 WHERE id = $1`,
          [row.id, userId, now, user.userId],
        );
        await audit(q, {
          mahallaId: user.mahallaId,
          actorId: user.userId,
          action: 'access_request.approve',
          targetType: 'USER',
          targetId: userId,
          meta: { login: body.login },
          ip: req.ip,
        });
      });
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new AppError('CONFLICT', 'Bu login band', { fields: { login: 'Bu login band' } });
      }
      throw err;
    }
    return { userId, login: body.login, temporaryPassword, expiresAt };
  },
});

const reject = route({
  method: 'post',
  path: '/admin/access-requests/:id/reject',
  auth: 'admin',
  tag: TAG,
  summary: "So'rovni rad etish",
  params: idParam,
  body: z.object({ note: z.string().trim().max(500).optional() }),
  handler: async ({ deps, user, params, body, now, req }) => {
    const r = await deps.db.query<RequestRow>(
      `UPDATE access_requests SET status = 'REJECTED', note = $3, decided_at = $4, decided_by = $5
        WHERE id = $1 AND mahalla_id = $2 AND status = 'PENDING' RETURNING ${COLUMNS}`,
      [params.id, user.mahallaId, body.note ?? null, now, user.userId],
    );
    if (!r.rows[0]) throw new AppError('NOT_FOUND');
    await audit(deps.db, {
      mahallaId: user.mahallaId,
      actorId: user.userId,
      action: 'access_request.reject',
      targetType: 'ACCESS_REQUEST',
      targetId: params.id,
      ip: req.ip,
    });
    return toRequest(r.rows[0]);
  },
});

export const accessRequestRoutes = [create, list, approve, reject];
