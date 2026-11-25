import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

/** Demo ma'lumot uchun mavzuli rasm: bir xil rangli to'rtburchak o'rniga toifaga mos chizma (SVG -> JPEG). */
export type Scene = 'ROAD' | 'LIGHTING' | 'WASTE' | 'WATER' | 'LANDSCAPING' | 'OTHER' | 'EVENT' | 'DONE';

const PALETTE: Record<Scene, [string, string]> = {
  ROAD: ['#f6b352', '#e2693a'],
  LIGHTING: ['#1b2a6b', '#3b5bdb'],
  WASTE: ['#2f9e6e', '#0b6e4f'],
  WATER: ['#38bdf8', '#1d4ed8'],
  LANDSCAPING: ['#84cc16', '#15803d'],
  OTHER: ['#a78bfa', '#6d28d9'],
  EVENT: ['#fb7185', '#c026d3'],
  DONE: ['#34d399', '#047857'],
};

const W = 1024;
const H = 768;

function art(scene: Scene): string {
  switch (scene) {
    case 'ROAD':
      return `
        <path d="M380 768 L470 330 L554 330 L644 768 Z" fill="#3b3b46"/>
        <rect x="503" y="360" width="18" height="60" rx="6" fill="#fde68a"/>
        <rect x="501" y="470" width="22" height="80" rx="7" fill="#fde68a"/>
        <rect x="498" y="610" width="28" height="110" rx="8" fill="#fde68a"/>
        <ellipse cx="600" cy="640" rx="70" ry="22" fill="#26262e"/>
        <path d="M720 520 l40 -90 l40 90 z" fill="#fb923c" stroke="#fff" stroke-width="8" stroke-linejoin="round"/>
        <rect x="712" y="520" width="96" height="16" rx="6" fill="#fff"/>`;
    case 'LIGHTING':
      return `
        <circle cx="820" cy="150" r="56" fill="#fef9c3" opacity="0.9"/>
        <circle cx="790" cy="135" r="52" fill="#1b2a6b"/>
        <rect x="300" y="250" width="22" height="520" rx="10" fill="#cbd5e1"/>
        <path d="M311 260 q0 -60 110 -60 h40" stroke="#cbd5e1" stroke-width="20" fill="none" stroke-linecap="round"/>
        <path d="M440 190 h90 l-20 44 h-50 z" fill="#64748b"/>
        <path d="M455 234 L380 520 L640 520 L515 234 Z" fill="#fde68a" opacity="0.18"/>
        <line x1="470" y1="250" x2="500" y2="290" stroke="#f87171" stroke-width="10" stroke-linecap="round"/>
        <line x1="500" y1="250" x2="470" y2="290" stroke="#f87171" stroke-width="10" stroke-linecap="round"/>`;
    case 'WASTE':
      return `
        <rect x="370" y="330" width="290" height="330" rx="26" fill="#14532d"/>
        <rect x="350" y="300" width="330" height="50" rx="18" fill="#166534"/>
        <rect x="410" y="390" width="20" height="220" rx="10" fill="#22c55e" opacity="0.5"/>
        <rect x="505" y="390" width="20" height="220" rx="10" fill="#22c55e" opacity="0.5"/>
        <rect x="600" y="390" width="20" height="220" rx="10" fill="#22c55e" opacity="0.5"/>
        <circle cx="300" cy="640" r="40" fill="#e5e7eb"/>
        <rect x="690" y="610" width="90" height="60" rx="12" fill="#fcd34d"/>
        <circle cx="430" cy="270" r="30" fill="#d1d5db"/>
        <circle cx="560" cy="262" r="38" fill="#9ca3af"/>`;
    case 'WATER':
      return `
        <rect x="0" y="420" width="1024" height="70" fill="#64748b"/>
        <rect x="470" y="400" width="84" height="110" rx="14" fill="#475569"/>
        <path d="M512 520 C470 590 450 630 450 660 a62 62 0 0 0 124 0 c0 -30 -20 -70 -62 -140 z" fill="#e0f2fe"/>
        <circle cx="380" cy="600" r="16" fill="#e0f2fe" opacity="0.8"/>
        <circle cx="650" cy="580" r="12" fill="#e0f2fe" opacity="0.8"/>
        <ellipse cx="512" cy="720" rx="230" ry="26" fill="#bae6fd" opacity="0.6"/>`;
    case 'LANDSCAPING':
      return `
        <ellipse cx="512" cy="760" rx="700" ry="160" fill="#166534"/>
        <rect x="290" y="440" width="26" height="200" rx="10" fill="#78350f"/>
        <circle cx="303" cy="410" r="96" fill="#22c55e"/>
        <circle cx="250" cy="460" r="60" fill="#16a34a"/>
        <rect x="700" y="470" width="22" height="170" rx="10" fill="#78350f"/>
        <circle cx="711" cy="440" r="80" fill="#4ade80"/>
        <rect x="430" y="560" width="200" height="22" rx="10" fill="#fef3c7"/>
        <rect x="445" y="582" width="14" height="60" fill="#fef3c7"/>
        <rect x="600" y="582" width="14" height="60" fill="#fef3c7"/>`;
    case 'EVENT':
      return `
        <path d="M120 220 Q512 330 904 220" stroke="#fff" stroke-width="6" fill="none" opacity="0.8"/>
        ${[0, 1, 2, 3, 4, 5, 6]
          .map((i) => {
            const x = 170 + i * 115;
            const y = 250 + Math.round(Math.sin((i / 6) * Math.PI) * 50);
            const c = ['#fde047', '#38bdf8', '#4ade80', '#fff'][i % 4];
            return `<path d="M${x - 28} ${y} h56 l-28 56 z" fill="${c}"/>`;
          })
          .join('')}
        <circle cx="380" cy="560" r="70" fill="#fde047"/>
        <circle cx="520" cy="520" r="88" fill="#fff" opacity="0.9"/>
        <circle cx="660" cy="570" r="64" fill="#38bdf8"/>
        <rect x="300" y="620" width="440" height="60" rx="20" fill="#fff" opacity="0.25"/>`;
    case 'DONE':
      return `
        <circle cx="512" cy="400" r="170" fill="#fff" opacity="0.95"/>
        <path d="M430 405 l60 60 l120 -130" stroke="#059669" stroke-width="40" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
    default:
      return `
        <rect x="320" y="300" width="384" height="300" rx="36" fill="#fff" opacity="0.92"/>
        <rect x="370" y="360" width="200" height="22" rx="11" fill="#c4b5fd"/>
        <rect x="370" y="410" width="284" height="22" rx="11" fill="#ddd6fe"/>
        <rect x="370" y="460" width="240" height="22" rx="11" fill="#ddd6fe"/>
        <circle cx="660" cy="300" r="46" fill="#f59e0b"/>
        <rect x="652" y="270" width="16" height="38" rx="8" fill="#fff"/>
        <circle cx="660" cy="324" r="9" fill="#fff"/>`;
  }
}

function svg(scene: Scene, seed: number): string {
  const [a, b] = PALETTE[scene];
  // Fon bezaklari: har rasmda biroz boshqacha joylashadi
  const blobs = [0, 1, 2]
    .map((i) => {
      const x = (seed * (i + 3) * 137) % W;
      const y = (seed * (i + 5) * 71) % (H / 2);
      return `<circle cx="${x}" cy="${y}" r="${120 + i * 40}" fill="#fff" opacity="0.07"/>`;
    })
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#g)"/>${blobs}${art(scene)}
  </svg>`;
}

/** Asosiy rasm (1024x768) va thumbnail (480 px) JPEG ko'rinishida. */
export async function illustration(scene: Scene, seed: number): Promise<{ main: Buffer; thumb: Buffer }> {
  const base = sharp(Buffer.from(svg(scene, seed)));
  const main = await base.clone().jpeg({ quality: 85 }).toBuffer();
  const thumb = await base.clone().resize({ width: 480 }).jpeg({ quality: 78 }).toBuffer();
  return { main, thumb };
}

/** Dizayn maketidagi haqiqiy suratlar (`db/demo-photos/`): demo ma'lumotda chizma o'rniga ishlatiladi. */
export type DemoPhoto = 'street-lamp' | 'mahalla-street';

/** Surat 1024x768 (4:3) ga kesilib JPEG + 480 px thumbnail; fayl topilmasa `null` (chizmaga qaytiladi). */
export async function demoPhoto(name: DemoPhoto): Promise<{ main: Buffer; thumb: Buffer } | null> {
  const file = path.resolve(process.cwd(), 'db/demo-photos', `${name}.webp`);
  if (!fs.existsSync(file)) return null;
  const base = sharp(file).resize({ width: 1024, height: 768, fit: 'cover' });
  const main = await base.clone().jpeg({ quality: 85 }).toBuffer();
  const thumb = await base.clone().resize({ width: 480 }).jpeg({ quality: 78 }).toBuffer();
  return { main, thumb };
}
