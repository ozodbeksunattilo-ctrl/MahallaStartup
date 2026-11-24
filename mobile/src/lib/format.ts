// Barcha sana/vaqt Asia/Tashkent bo'yicha ko'rsatiladi (backend UTC saqlaydi, TZ 4-bo'lim).
const TZ = 'Asia/Tashkent';
const MONTHS = [
  'yanvar',
  'fevral',
  'mart',
  'aprel',
  'may',
  'iyun',
  'iyul',
  'avgust',
  'sentabr',
  'oktabr',
  'noyabr',
  'dekabr',
];

function parts(iso: string | Date) {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  const f = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => Number(f.find((p) => p.type === t)?.value ?? 0);
  return { y: get('year'), m: get('month'), d: get('day'), h: get('hour') % 24, min: get('minute') };
}

const pad = (n: number) => String(n).padStart(2, '0');

export function formatDate(iso: string): string {
  const p = parts(iso);
  return `${p.d} ${MONTHS[p.m - 1]} ${p.y}`;
}

export function formatTime(iso: string): string {
  const p = parts(iso);
  return `${pad(p.h)}:${pad(p.min)}`;
}

export function formatDateTime(iso: string): string {
  return `${formatDate(iso)}, ${formatTime(iso)}`;
}

/** `YYYY-MM-DD` (backend `dueDate`) -> «5 dekabr 2026» */
export function formatDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  return `${d} ${MONTHS[(m ?? 1) - 1]} ${y}`;
}

export function monthName(iso: string): string {
  const p = parts(iso);
  return MONTHS[p.m - 1] ?? '';
}

/** Hozirdan `iso` gacha qolgan vaqt: «3 kun 4 soat» */
export function timeLeft(iso: string, now = Date.now()): string {
  const ms = new Date(iso).getTime() - now;
  if (ms <= 0) return 'tugadi';
  const mins = Math.floor(ms / 60000);
  const days = Math.floor(mins / 1440);
  const hours = Math.floor((mins % 1440) / 60);
  if (days > 0) return `${days} kun ${hours} soat`;
  if (hours > 0) return `${hours} soat ${mins % 60} daqiqa`;
  return `${Math.max(1, mins)} daqiqa`;
}

export function timeAgo(iso: string, now = Date.now()): string {
  const s = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'hozirgina';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} daqiqa oldin`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} soat oldin`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} kun oldin`;
  return formatDate(iso);
}
