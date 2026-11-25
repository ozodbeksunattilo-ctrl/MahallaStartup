import { z } from 'zod';
import type { Deps } from '../../core/deps';
import { dt } from '../../core/schemas';
import { CATEGORY_LABELS, type Category, type IssueStatus } from '../../core/types';

export const MEDIA_URL_TTL_SEC = 300;

export const STATUS_LABELS: Record<IssueStatus, string> = {
  PENDING_REVIEW: 'Moderatsiyada',
  OPEN: 'Ochiq',
  REJECTED: 'Tuzatish kerak',
  MERGED: 'Birlashtirilgan',
  SELECTED: 'Oylik ovozda tanlandi',
  IN_PROGRESS: 'Jarayonda',
  REFERRED: 'Tashkilotdan javob kutilmoqda',
  RESOLVED: 'Hal qilingan',
};

/** `OPEN` + joriy davrda -> «Ovoz berilmoqda». */
export function statusLabel(status: IssueStatus, inCurrentRound: boolean): string {
  if (status === 'OPEN' && inCurrentRound) return 'Ovoz berilmoqda';
  return STATUS_LABELS[status];
}

export const mediaSchema = z.object({
  id: z.uuid(),
  kind: z.enum(['IMAGE', 'VIDEO']),
  url: z.string(),
  thumbUrl: z.string().nullable(),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
  mime: z.string(),
  sizeBytes: z.number().int(),
  expiresAt: dt,
});
/** Ichki tip: sanalar Date (JSON'ga o'tganda ISO qator bo'ladi — sxemada shunday tasvirlangan). */
export type MediaDto = Omit<z.infer<typeof mediaSchema>, 'expiresAt'> & { expiresAt: Date };

export interface MediaRow {
  id: string;
  issue_id: string | null;
  issue_update_id: string | null;
  kind: 'IMAGE' | 'VIDEO';
  storage_key: string;
  thumb_key: string | null;
  mime: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
}

export const MEDIA_COLUMNS =
  'id, issue_id, issue_update_id, kind, storage_key, thumb_key, mime, size_bytes, width, height';

/** Presigned/imzoli URL'lar lokal hisoblanadi (tarmoq so'rovisiz). Faqat ruxsat tekshirilgandan KEYIN chaqiring. */
export async function signMedia(deps: Pick<Deps, 'storage'>, rows: readonly MediaRow[], now: Date): Promise<MediaDto[]> {
  const expiresAt = new Date(now.getTime() + MEDIA_URL_TTL_SEC * 1000);
  return Promise.all(
    rows.map(async (m) => ({
      id: m.id,
      kind: m.kind,
      url: await deps.storage.signedUrl(m.storage_key, MEDIA_URL_TTL_SEC, now),
      thumbUrl: m.thumb_key ? await deps.storage.signedUrl(m.thumb_key, MEDIA_URL_TTL_SEC, now) : null,
      width: m.width,
      height: m.height,
      mime: m.mime,
      sizeBytes: m.size_bytes,
      expiresAt,
    })),
  );
}

/** `issues` jadvali ustunlari (sanalar `YYYY-MM-DD` matn sifatida). */
export const ISSUE_COLUMNS = `i.id, i.mahalla_id, i.author_id, i.title, i.description, i.category, i.location_text,
  i.status, i.published_at, i.rejected_reason, i.duplicate_of_id, i.responsible, i.next_step,
  i.due_date::text AS due_date, i.referred_org, i.referred_at::text AS referred_at,
  i.follow_up_at::text AS follow_up_at, i.resolution_text, i.hidden_at, i.hidden_reason,
  i.comment_count, i.round_kind, i.created_at, i.updated_at`;

export interface IssueRow {
  id: string;
  mahalla_id: string;
  author_id: string;
  title: string;
  description: string;
  category: Category;
  location_text: string;
  status: IssueStatus;
  published_at: Date | null;
  rejected_reason: string | null;
  duplicate_of_id: string | null;
  responsible: string | null;
  next_step: string | null;
  due_date: string | null;
  referred_org: string | null;
  referred_at: string | null;
  follow_up_at: string | null;
  resolution_text: string | null;
  hidden_at: Date | null;
  hidden_reason: string | null;
  comment_count: number;
  /** Qaysi davrda ovozga chiqadi: oylik yoki haftalik */
  round_kind: 'MONTHLY' | 'WEEKLY';
  created_at: Date;
  updated_at: Date;
}

export const categoryLabel = (c: Category): string => CATEGORY_LABELS[c];

export const issueListItemSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  category: z.string(),
  categoryLabel: z.string(),
  locationText: z.string(),
  status: z.string(),
  statusLabel: z.string(),
  publishedAt: dt.nullable(),
  createdAt: dt,
  commentCount: z.number().int(),
  voteCount: z.number().int().nullable(),
  myVote: z.boolean(),
  roundKind: z.enum(['MONTHLY', 'WEEKLY']).describe('Ovoz davri turi: oylik yoki haftalik (1 hafta ichida hal qilinadi)'),
  isFollowing: z.boolean(),
  thumbUrl: z.string().nullable(),
  authorName: z.string(),
  responsible: z.string().nullable(),
  dueDate: z.string().nullable(),
  hidden: z.boolean(),
  rejectedReason: z.string().nullable(),
  duplicateOf: z.object({ id: z.uuid(), title: z.string() }).nullable(),
});
export type IssueListItem = Omit<z.infer<typeof issueListItemSchema>, 'publishedAt' | 'createdAt'> & {
  publishedAt: Date | null;
  createdAt: Date;
};
