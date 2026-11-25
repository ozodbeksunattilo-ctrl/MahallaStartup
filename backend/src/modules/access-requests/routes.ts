import { z } from 'zod';
import { AppError } from '../../common/app-error';
import { audit } from '../../core/audit';
import type { Deps } from '../../core/deps';
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

const mahallas = route({
  method: 'get',
  path: '/auth/mahallas',
  auth: 'public',
  tag: 'Auth',
  summary: "Mahallalar ro'yxati (ro'yxatdan o'tish formasidagi tanlash uchun)",
  query: z.object({ q: z.string().trim().max(100).optional() }),
  handler: async ({ deps, query }) => {
    const r = query.q
      ? await deps.db.query<{ id: string; name: string }>(
          'SELECT id, name FROM mahalla WHERE name ILIKE $1 ORDER BY name LIMIT 50',
          [`%${escapeLike(query.q)}%`],
        )
      : await deps.db.query<{ id: string; name: string }>('SELECT id, name FROM mahalla ORDER BY name LIMIT 200');
    return { items: r.rows };
  },
});

const create = route({
  method: 'post',
  path: '/auth/access-requests',
  auth: 'public',
  tag: 'Auth',
  summary: "Kirish so'rovi (mobil «Ro'yxatdan o'tish»; akkauntni mahalla admini beradi)",
  description:
    "`mahallaId` (GET /auth/mahallas dan) yoki `mahallaName` dan biri kerak. Javobdagi `id` bilan holatni " +
    'GET /auth/access-requests/{id} orqali tekshirish mumkin.',
  body: z
    .object({
      fullName: text(3, 100),
      phone: z
        .string()
        .trim()
        .regex(/^\+?[0-9 ()-]{9,32}$/, "Telefon raqami noto'g'ri"),
      mahallaId: z.uuid().optional(),
      mahallaName: text(2, 100).optional(),
      address: z.string().trim().max(200).optional(),
    })
    .refine((b) => b.mahallaId || b.mahallaName, { message: 'Mahallani tanlang', path: ['mahallaName'] }),
  status: 201,
  handler: async ({ deps, body, req, now }) => {
    await rateLimit(deps, { name: 'access-request-ip', limit: 5, windowSec: 3600, key: req.ip ?? 'unknown' });

    if (body.mahallaId) {
      const byId = await deps.db.query<{ id: string }>('SELECT id FROM mahalla WHERE id = $1', [body.mahallaId]);
      if (!byId.rows[0]) {
        throw new AppError('VALIDATION_ERROR', undefined, { fields: { mahallaId: 'Bunday mahalla topilmadi' } });
      }
      return insertRequest(deps, byId.rows[0].id, body, now);
    }
    const mahallaName = body.mahallaName ?? '';
    // Avval aniq moslik (nom yoki slug); bo'lmasa qisman moslik faqat bitta mahallaga tushsa —
    // aks holda so'rov noto'g'ri mahallaga (alifbo bo'yicha birinchisiga) ketib qolardi
    const exact = await deps.db.query<{ id: string }>(
      `SELECT id FROM mahalla WHERE lower(name) = lower($1) OR slug = lower($1) LIMIT 1`,
      [mahallaName],
    );
    let mahalla = exact.rows[0];
    if (!mahalla) {
      const partial = await deps.db.query<{ id: string }>(`SELECT id FROM mahalla WHERE name ILIKE $1 LIMIT 2`, [
        `%${escapeLike(mahallaName)}%`,
      ]);
      if (partial.rows.length > 1) {
        throw new AppError('VALIDATION_ERROR', undefined, {
          fields: { mahallaName: "Bir nechta mahalla mos keldi: to'liq nomini yozing" },
        });
      }
      mahalla = partial.rows[0];
    }
    if (!mahalla) {
      throw new AppError('VALIDATION_ERROR', undefined, { fields: { mahallaName: 'Bunday mahalla topilmadi' } });
    }
    return insertRequest(deps, mahalla.id, body, now);
  },
});

async function insertRequest(
  deps: Deps,
  mahallaId: string,
  body: { fullName: string; phone: string; address?: string },
  now: Date,
): Promise<{ id: string; status: 'PENDING' }> {
  const dup = await deps.db.query(
    `SELECT 1 FROM access_requests WHERE mahalla_id = $1 AND phone = $2 AND status = 'PENDING'`,
    [mahallaId, body.phone],
  );
  if (dup.rows.length > 0) throw new AppError('CONFLICT', "Bu raqamdan so'rov allaqachon yuborilgan");

  const id = uuidv7();
  await deps.db.query(
    `INSERT INTO access_requests (id, mahalla_id, full_name, phone, address, created_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, mahallaId, body.fullName, body.phone, body.address || null, now],
  );
  return { id, status: 'PENDING' };
}

const status = route({
  method: 'get',
  path: '/auth/access-requests/:id',
  auth: 'public',
  tag: 'Auth',
  summary: "Kirish so'rovi holati (PENDING / APPROVED / REJECTED); shaxsiy ma'lumot qaytarilmaydi",
  params: idParam,
  handler: async ({ deps, params }) => {
    const r = await deps.db.query<{ status: RequestRow['status']; note: string | null; decided_at: Date | null; mahalla_name: string }>(
      `SELECT a.status, a.note, a.decided_at, m.name AS mahalla_name
         FROM access_requests a JOIN mahalla m ON m.id = a.mahalla_id WHERE a.id = $1`,
      [params.id],
    );
    const row = r.rows[0];
    if (!row) throw new AppError('NOT_FOUND');
    return { id: params.id, status: row.status, note: row.note, decidedAt: row.decided_at, mahallaName: row.mahalla_name };
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

export const accessRequestRoutes = [mahallas, create, status, list, approve, reject];
