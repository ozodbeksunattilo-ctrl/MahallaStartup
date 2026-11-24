const TZ = 'Asia/Tashkent';

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('uz-UZ', {
    timeZone: TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('uz-UZ', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** `<input type="datetime-local">` qiymatini Toshkent vaqti (+05:00) bilan ISO ga aylantiradi. */
export function localToIso(value: string): string | undefined {
  return value ? `${value}:00+05:00` : undefined;
}
