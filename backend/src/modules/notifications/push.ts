import type { Deps } from '../../core/deps';
import { pgArray } from '../../core/sql';

const EXPO_URL = 'https://exp.host/--/api/v2/push';
const CHUNK = 100;

interface Pending {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  entity_type: string;
  entity_id: string;
}

interface Ticket {
  status: 'ok' | 'error';
  id?: string;
  details?: { error?: string };
}

/** Qabul qilingan ticket ID -> token (receipt tekshiruvi uchun). Jarayon qayta ishga tushsa yo'qoladi. */
const pendingReceipts = new Map<string, { token: string; at: number }>();
let warnedDisabled = false;

async function expoFetch(deps: Deps, path: string, body: unknown): Promise<{ data: unknown[] } | null> {
  const res = await fetch(`${EXPO_URL}/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${deps.env.EXPO_ACCESS_TOKEN}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Expo push: HTTP ${res.status}`);
  return (await res.json()) as { data: unknown[] };
}

/**
 * Yangi (hali push qilinmagan) bildirishnomalarni Expo orqali yuboradi. HTTP so'rov ichida emas, fon vazifasida.
 * `EXPO_ACCESS_TOKEN` bo'lmasa o'tkazib yuboriladi (ichki bildirishnomalar baribir ishlaydi).
 * `DeviceNotRegistered` tokenlar o'chiriladi.
 */
export async function runPushWorker(deps: Deps): Promise<number> {
  if (!deps.env.EXPO_ACCESS_TOKEN) {
    if (!warnedDisabled) {
      deps.log.info('EXPO_ACCESS_TOKEN berilmagan: push yuborish o\'chirilgan (ichki bildirishnomalar ishlaydi)');
      warnedDisabled = true;
    }
    return 0;
  }

  return deps.db.tx(async (q) => {
    const batch = await q.query<Pending>(
      `SELECT id, user_id, type, title, body, entity_type, entity_id FROM notifications
        WHERE pushed_at IS NULL AND created_at > now() - interval '2 days'
        ORDER BY created_at LIMIT 200 FOR UPDATE SKIP LOCKED`,
    );
    if (batch.rows.length === 0) return 0;

    const tokens = await q.query<{ user_id: string; expo_push_token: string }>(
      'SELECT user_id, expo_push_token FROM device_tokens WHERE user_id = ANY($1::uuid[])',
      [pgArray([...new Set(batch.rows.map((n) => n.user_id))])],
    );
    const byUser = new Map<string, string[]>();
    for (const t of tokens.rows) byUser.set(t.user_id, [...(byUser.get(t.user_id) ?? []), t.expo_push_token]);

    const messages = batch.rows.flatMap((n) =>
      (byUser.get(n.user_id) ?? []).map((to) => ({
        to,
        title: n.title,
        body: n.body,
        sound: 'default',
        data: { notificationId: n.id, type: n.type, entityType: n.entity_type, entityId: n.entity_id },
      })),
    );

    const dead: string[] = [];
    for (let i = 0; i < messages.length; i += CHUNK) {
      const chunk = messages.slice(i, i + CHUNK);
      try {
        const res = await expoFetch(deps, 'send', chunk);
        (res?.data as Ticket[] | undefined)?.forEach((t, idx) => {
          const token = chunk[idx]?.to;
          if (!token) return;
          if (t.status === 'ok' && t.id) pendingReceipts.set(t.id, { token, at: Date.now() });
          if (t.status === 'error' && t.details?.error === 'DeviceNotRegistered') dead.push(token);
        });
      } catch (err) {
        deps.log.warn({ err }, 'push yuborilmadi');
        throw err; // tranzaksiya bekor: keyingi urinishda qayta uriniladi
      }
    }

    if (dead.length > 0) {
      await q.query('DELETE FROM device_tokens WHERE expo_push_token = ANY($1::text[])', [pgArray(dead)]);
    }
    await q.query('UPDATE notifications SET pushed_at = now() WHERE id = ANY($1::uuid[])', [
      pgArray(batch.rows.map((n) => n.id)),
    ]);
    return batch.rows.length;
  });
}

/** 15 daqiqadan oshgan ticketlar uchun receipt tekshiradi va `DeviceNotRegistered` tokenlarni o'chiradi. */
export async function checkPushReceipts(deps: Deps): Promise<void> {
  if (!deps.env.EXPO_ACCESS_TOKEN || pendingReceipts.size === 0) return;
  // Expo receipt'larni ~24 soat saqlaydi: undan eskisi hech qachon kelmaydi, xotirada to'planib qolmasin
  const stale = Date.now() - 24 * 3600_000;
  for (const [id, v] of pendingReceipts) if (v.at < stale) pendingReceipts.delete(id);
  const cutoff = Date.now() - 15 * 60_000;
  const due = [...pendingReceipts.entries()].filter(([, v]) => v.at <= cutoff).slice(0, 300);
  if (due.length === 0) return;
  try {
    const res = await expoFetch(deps, 'getReceipts', { ids: due.map(([id]) => id) });
    const data = (res?.data ?? {}) as unknown as Record<string, { status: string; details?: { error?: string } }>;
    const dead: string[] = [];
    for (const [id, v] of due) {
      const receipt = data[id];
      if (!receipt) continue;
      pendingReceipts.delete(id);
      if (receipt.status === 'error' && receipt.details?.error === 'DeviceNotRegistered') dead.push(v.token);
    }
    if (dead.length > 0) {
      await deps.db.query('DELETE FROM device_tokens WHERE expo_push_token = ANY($1::text[])', [pgArray(dead)]);
    }
  } catch (err) {
    deps.log.warn({ err }, 'push receipt tekshirilmadi');
  }
}
