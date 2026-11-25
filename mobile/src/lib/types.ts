// Backend javoblari (backend/src/contract/response-examples.json va openapi.yaml asosida).

export interface Mahalla {
  id: string;
  name: string;
  slug: string;
}

export interface User {
  id: string;
  login: string;
  displayName: string;
  phone: string | null;
  role: 'RESIDENT' | 'MAHALLA_ADMIN';
  mahalla: Mahalla;
}

export interface Me {
  user: User;
  mahalla: Mahalla;
  role: User['role'];
  mustChangePassword: boolean;
  unreadNotifications: number;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

/** Ovoz davri turi: oylik va haftalik davrlar parallel ishlaydi (har birida 3 tadan ovoz). */
export type RoundKind = 'MONTHLY' | 'WEEKLY';

export interface Home {
  round: { periodEnd: string; votesLeft: number } | null;
  /** Haftalik davr: qolgan ovozlar */
  weeklyRound?: { periodEnd: string; votesLeft: number };
  /** Hafta muammosi: oxirgi haftalik g'olib (1 hafta ichida hal qilinishi kerak) */
  weeklyIssue?: { id: string; title: string; status: string; statusLabel: string; dueDate: string | null } | null;
  featuredIssue: { id: string; title: string; status: string; statusLabel: string } | null;
  nextEvent: { id: string; title: string; startsAt: string; location: string } | null;
  latestImportantAnnouncement: { id: string; title: string; publishedAt: string } | null;
  unreadNotifications: number;
}

export interface IssueListItem {
  id: string;
  title: string;
  category: string;
  categoryLabel: string;
  locationText: string;
  status: string;
  statusLabel: string;
  publishedAt: string | null;
  createdAt: string;
  commentCount: number;
  voteCount: number | null;
  myVote: boolean;
  roundKind: RoundKind;
  isFollowing: boolean;
  thumbUrl: string | null;
  authorName: string;
  responsible: string | null;
  dueDate: string | null;
  hidden: boolean;
  rejectedReason: string | null;
  duplicateOf: { id: string; title: string } | null;
}

export interface Media {
  id: string;
  kind: 'IMAGE' | 'VIDEO';
  url: string;
  thumbUrl: string | null;
  width: number | null;
  height: number | null;
  mime: string;
  sizeBytes: number;
  expiresAt: string;
}

export interface IssueHistoryItem {
  id: string;
  type: 'STATUS_CHANGE' | 'DETAILS_CHANGE' | 'AUTHOR_FEEDBACK' | 'CARRY_OVER';
  fromStatus: string | null;
  toStatus: string | null;
  reason: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
  actorName: string | null;
  media: Media[];
}

export interface IssueDetail {
  id: string;
  title: string;
  category: string;
  categoryLabel: string;
  status: string;
  statusLabel: string;
  hidden: boolean;
  author: { id: string; displayName: string };
  createdAt: string;
  publishedAt: string | null;
  description: string;
  locationText: string;
  media: Media[];
  voteCount: number | null;
  roundId: string | null;
  roundKind: RoundKind;
  myVote: boolean;
  isFollowing: boolean;
  canVote: boolean;
  commentCount: number;
  duplicateOf: { id: string; title: string } | null;
  rejectedReason: string | null;
  responsible: string | null;
  nextStep: string | null;
  dueDate: string | null;
  referredOrg: string | null;
  referredAt: string | null;
  followUpAt: string | null;
  resolutionText: string | null;
  hiddenReason: string | null;
  history: IssueHistoryItem[];
}

export interface Comment {
  id: string;
  text: string;
  authorId: string;
  authorName: string;
  createdAt: string;
}

/** Bitta davr turi bo'yicha holat: ishlatilgan/qolgan ovozlar va qaysi muammolarga ovoz berilgan. */
export interface RoundState {
  round: { id: string; kind?: RoundKind; status: string; periodStart: string; periodEnd: string } | null;
  periodStart: string;
  periodEnd: string;
  votesUsed: number;
  votesLeft: number;
  myVotes: Array<{ issueId: string; title: string; slot: number }>;
}

/** GET /rounds/current: yuqori daraja — oylik davr, `weekly` — parallel haftalik davr. */
export interface CurrentRound extends RoundState {
  weekly?: RoundState;
}

/** Tanlangan turdagi davr holati (eski backend `weekly` bermasa — null). */
export const roundOf = (c: CurrentRound | null, kind: RoundKind): RoundState | null =>
  c === null ? null : kind === 'WEEKLY' ? (c.weekly ?? null) : c;

export interface VoteResult {
  issueId: string;
  voted: boolean;
  slot: number | null;
  votesUsed: number;
  votesLeft: number;
  /** Ovoz qaysi davrda hisoblandi */
  roundKind?: RoundKind;
}

export interface RoundListItem {
  id: string;
  kind?: RoundKind;
  status: string;
  periodStart: string;
  periodEnd: string;
  winner: { issueId: string; title: string; votes: number } | null;
  totalVoters: number | null;
  totalVotes: number | null;
}

export interface RoundResult {
  roundId: string;
  kind?: RoundKind;
  periodStart: string;
  periodEnd: string;
  closedAt: string | null;
  winner: { rank: number; title: string; votes: number; issueId: string } | null;
  ranking: Array<{ rank: number; title: string; votes: number; issueId: string }>;
  totalVoters: number;
  totalVotes: number;
  message: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  /** Admin xabarlari chatda alohida belgilanadi */
  senderRole?: 'RESIDENT' | 'MAHALLA_ADMIN';
  mine: boolean;
  createdAt: string;
}

export interface EventItem {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string | null;
  location: string;
  organizer: string;
  status: 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';
  version: number;
  resultText: string | null;
  rsvpCount: number;
  myRsvp: boolean;
  createdAt: string;
}

export interface EventDetail extends EventItem {
  media: Media[];
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  isImportant: boolean;
  status: string;
  publishedAt: string | null;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  entityType: 'ISSUE' | 'EVENT' | 'ANNOUNCEMENT' | 'ROUND' | null;
  entityId: string | null;
  read: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface Category {
  value: string;
  label: string;
}
