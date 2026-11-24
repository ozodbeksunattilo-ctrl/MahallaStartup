/**
 * Holatlar uchun yagona rang va ikonka jadvali. Har bir holat o'z rangiga ega, rang takrorlanmaydi,
 * ikonka rangga qo'shimcha belgi (faqat rangga tayanilmaydi).
 *
 * Kalit: `<soha>:<HOLAT>`; soha bo'yicha bo'lgani uchun bir xil nomli holatlar (OPEN) turli ma'noda bo'la oladi.
 */
export interface StatusStyle {
  color: string;
  /** components/NavIcon.tsx dagi ikonka nomi */
  icon: string;
}

const AMBER = '#d97706';
const BLUE = '#2563eb';
const VIOLET = '#7c3aed';
const TEAL = '#0891b2';
const ORANGE = '#ea580c';
const GREEN = '#16a34a';
const RED = '#dc2626';
const SLATE = '#64748b';

export const STATUS_STYLE: Record<string, StatusStyle> = {
  // Muammolar
  'issue:PENDING_REVIEW': { color: AMBER, icon: 'hourglass' },
  'issue:OPEN': { color: BLUE, icon: 'vote' },
  'issue:SELECTED': { color: VIOLET, icon: 'trophy' },
  'issue:IN_PROGRESS': { color: TEAL, icon: 'wrench' },
  'issue:REFERRED': { color: ORANGE, icon: 'send' },
  'issue:RESOLVED': { color: GREEN, icon: 'check' },
  'issue:REJECTED': { color: RED, icon: 'edit' },
  'issue:MERGED': { color: SLATE, icon: 'link' },
  // Tadbirlar
  'event:DRAFT': { color: SLATE, icon: 'edit' },
  'event:PUBLISHED': { color: BLUE, icon: 'calendar' },
  'event:COMPLETED': { color: GREEN, icon: 'check' },
  'event:CANCELLED': { color: RED, icon: 'close' },
  // Shikoyatlar
  'report:OPEN': { color: AMBER, icon: 'alert' },
  'report:ACTIONED': { color: GREEN, icon: 'check' },
  'report:DISMISSED': { color: SLATE, icon: 'close' },
  // Kirish so'rovlari
  'access:PENDING': { color: AMBER, icon: 'clock' },
  'access:APPROVED': { color: GREEN, icon: 'check' },
  'access:REJECTED': { color: RED, icon: 'close' },
  // Aholi
  'resident:ACTIVE': { color: GREEN, icon: 'check' },
  'resident:BLOCKED': { color: RED, icon: 'lock' },
  // Ovoz davrlari
  'round:OPEN': { color: BLUE, icon: 'vote' },
  'round:CLOSED': { color: SLATE, icon: 'lock' },
  // Qo'shimcha belgilar
  'flag:IMPORTANT': { color: ORANGE, icon: 'megaphone' },
  'flag:HIDDEN': { color: SLATE, icon: 'eye' },
  'flag:TEMP_PASSWORD': { color: VIOLET, icon: 'key' },
  // E'lonlar
  'announcement:PUBLISHED': { color: BLUE, icon: 'megaphone' },
  'announcement:DRAFT': { color: SLATE, icon: 'edit' },
};
