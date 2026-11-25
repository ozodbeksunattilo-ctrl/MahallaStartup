import { AppError } from '../../common/app-error';
import { audit } from '../../core/audit';
import type { Queryable } from '../../core/db';
import type { Deps } from '../../core/deps';
import { Params } from '../../core/sql';
import type { AuthUser } from '../../core/types';

export type ContentType = 'post' | 'comment' | 'chat_message';

const TABLES: Record<ContentType, string> = {
  post: 'issues',
  comment: 'comments',
  chat_message: 'chat_messages',
};

/** Izoh holati: `issues.comment_count` faqat ko'rinadigan izohlarni sanaydi (yashirish/qaytarishda moslanadi). */
async function commentState(
  q: Queryable,
  type: ContentType,
  id: string,
  mahallaId: string,
): Promise<{ issue_id: string; hidden_at: Date | null } | null> {
  if (type !== 'comment') return null;
  const r = await q.query<{ issue_id: string; hidden_at: Date | null }>(
    'SELECT issue_id, hidden_at FROM comments WHERE id = $1 AND mahalla_id = $2 FOR UPDATE',
    [id, mahallaId],
  );
  return r.rows[0] ?? null;
}

const adjustCommentCount = (q: Queryable, issueId: string, delta: 1 | -1) =>
  q.query('UPDATE issues SET comment_count = GREATEST(comment_count + $2, 0) WHERE id = $1', [issueId, delta]);

/** Kontentni yashiradi (status emas — alohida `hidden_at`). Chatda `message:hidden` tarqatiladi. */
export async function hideContent(
  deps: Pick<Deps, 'realtime'>,
  q: Queryable,
  user: AuthUser,
  type: ContentType,
  id: string,
  reason: string,
  now: Date,
  ip?: string,
): Promise<void> {
  const table = TABLES[type];
  const before = await commentState(q, type, id, user.mahallaId);
  const p = new Params();
  const sets = [`hidden_at = ${p.add(now)}`, `hidden_reason = ${p.add(reason)}`];
  if (table === 'issues') sets.push(`hidden_by_id = ${p.add(user.userId)}`);
  const r = await q.query(
    `UPDATE ${table} SET ${sets.join(', ')}
      WHERE id = ${p.add(id)} AND mahalla_id = ${p.add(user.mahallaId)}${table === 'issues' ? ' AND deleted_at IS NULL' : ''}`,
    p.values,
  );
  if (r.rowCount === 0) throw new AppError('NOT_FOUND');
  if (before && !before.hidden_at) await adjustCommentCount(q, before.issue_id, -1);
  if (type === 'chat_message') deps.realtime.emitToMahalla(user.mahallaId, 'message:hidden', { id });
  await audit(q, {
    mahallaId: user.mahallaId,
    actorId: user.userId,
    action: 'content.hide',
    targetType: type.toUpperCase(),
    targetId: id,
    reason,
    ip: ip ?? null,
  });
}

export async function unhideContent(
  q: Queryable,
  user: AuthUser,
  type: ContentType,
  id: string,
  ip?: string,
): Promise<void> {
  const table = TABLES[type];
  const before = await commentState(q, type, id, user.mahallaId);
  const extra = table === 'issues' ? ', hidden_by_id = NULL' : '';
  const r = await q.query(
    `UPDATE ${table} SET hidden_at = NULL, hidden_reason = NULL${extra} WHERE id = $1 AND mahalla_id = $2`,
    [id, user.mahallaId],
  );
  if (r.rowCount === 0) throw new AppError('NOT_FOUND');
  if (before?.hidden_at) await adjustCommentCount(q, before.issue_id, 1);
  await audit(q, {
    mahallaId: user.mahallaId,
    actorId: user.userId,
    action: 'content.unhide',
    targetType: type.toUpperCase(),
    targetId: id,
    ip: ip ?? null,
  });
}
