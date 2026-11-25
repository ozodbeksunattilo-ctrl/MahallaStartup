import { z } from 'zod';

export const issueStatusEnum = z.enum([
  'PENDING_REVIEW',
  'OPEN',
  'REJECTED',
  'MERGED',
  'SELECTED',
  'IN_PROGRESS',
  'REFERRED',
  'RESOLVED',
]);

/** Ovoz davri turi: oylik yoki haftalik (parallel). */
export const roundKindEnum = z.enum(['MONTHLY', 'WEEKLY']);
