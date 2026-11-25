/** Toshkent UTC+5, DST yo'q: `2026-12` davri = `2026-11-30T19:00:00Z` ... `2026-12-31T19:00:00Z`. */
const TZ_OFFSET_MS = 5 * 3600_000;
const DAY_MS = 24 * 3600_000;

/** Ovoz davri turi: oylik va haftalik davrlar parallel ishlaydi. */
export type RoundKind = 'MONTHLY' | 'WEEKLY';
export const ROUND_KINDS: readonly RoundKind[] = ['MONTHLY', 'WEEKLY'];

export interface Period {
  /** Oylik: `YYYY-MM`; haftalik: `W-YYYY-MM-DD` (hafta boshlanadigan dushanba) */
  key: string;
  start: Date;
  end: Date;
}

export function periodOf(year: number, month0: number): Period {
  const start = new Date(Date.UTC(year, month0, 1) - TZ_OFFSET_MS);
  const end = new Date(Date.UTC(year, month0 + 1, 1) - TZ_OFFSET_MS);
  const shifted = new Date(Date.UTC(year, month0, 1));
  const key = `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}`;
  return { key, start, end };
}

/** `at` qaysi oylik davrga tushadi (Toshkent vaqti bo'yicha). */
export function periodFor(at: Date): Period {
  const shifted = new Date(at.getTime() + TZ_OFFSET_MS);
  return periodOf(shifted.getUTCFullYear(), shifted.getUTCMonth());
}

/** `at` qaysi haftalik davrga tushadi: dushanba 00:00 dan keyingi dushanba 00:00 gacha (Toshkent vaqti). */
export function weekPeriodFor(at: Date): Period {
  const shifted = new Date(at.getTime() + TZ_OFFSET_MS);
  const sinceMonday = (shifted.getUTCDay() + 6) % 7;
  const mondayUtc = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate() - sinceMonday);
  const start = new Date(mondayUtc - TZ_OFFSET_MS);
  return { key: `W-${new Date(mondayUtc).toISOString().slice(0, 10)}`, start, end: new Date(start.getTime() + 7 * DAY_MS) };
}

export const periodForKind = (kind: RoundKind, at: Date): Period => (kind === 'WEEKLY' ? weekPeriodFor(at) : periodFor(at));

export function parsePeriodKey(key: string): Period | null {
  const m = /^(\d{4})-(\d{2})$/.exec(key);
  if (!m) return null;
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  return periodOf(Number(m[1]), month - 1);
}
