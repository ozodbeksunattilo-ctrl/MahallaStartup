import { ApiError, api } from './api';
import { haptic } from './haptics';
import type { VoteResult } from './types';

export interface VoteOutcome {
  voted: boolean;
  /** PUT javobida keladi; DELETE (204) da yo'q — chaqiruvchi davrni qayta o'qiydi */
  result: VoteResult | null;
}

/**
 * Ovoz berish / qaytarib olish. Chaqiruvchi UI'ni oldindan (optimistik) yangilaydi, xato bo'lsa — qaytaradi.
 * PUT /issues/:id/vote · DELETE /issues/:id/vote
 */
export async function toggleVote(issueId: string, votedNow: boolean): Promise<VoteOutcome> {
  haptic.impact();
  if (votedNow) {
    await api(`/issues/${issueId}/vote`, { method: 'DELETE' });
    return { voted: false, result: null };
  }
  const result = await api<VoteResult>(`/issues/${issueId}/vote`, { method: 'PUT' });
  haptic.success();
  return { voted: true, result };
}

/** Ovoz holati eskirganini bildiruvchi xatolar: ro'yxat va davr qayta o'qilishi kerak */
export const isStaleVoteError = (e: unknown): boolean =>
  e instanceof ApiError && ['ROUND_CLOSED', 'ISSUE_NOT_VOTABLE', 'VOTE_LIMIT_REACHED'].includes(e.code);
