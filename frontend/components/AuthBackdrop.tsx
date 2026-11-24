'use client';

import { LangSwitch } from '@/components/LangSwitch';
import { useRef, type CSSProperties, type PointerEvent, type ReactNode } from 'react';

// Barglar qiymatlari qat'iy (tasodifiy emas): server va brauzer bir xil chizadi.
const LEAVES = [
  { x: 4, s: 30, d: 16, t: 0, c: 0, r: 20 },
  { x: 11, s: 22, d: 20, t: 6, c: 1, r: -30 },
  { x: 18, s: 36, d: 18, t: 2, c: 2, r: 45 },
  { x: 26, s: 20, d: 22, t: 9, c: 3, r: 10 },
  { x: 33, s: 28, d: 17, t: 4, c: 0, r: -15 },
  { x: 41, s: 34, d: 21, t: 12, c: 1, r: 60 },
  { x: 48, s: 22, d: 19, t: 1, c: 4, r: -45 },
  { x: 55, s: 30, d: 23, t: 7, c: 2, r: 25 },
  { x: 62, s: 24, d: 16, t: 10, c: 0, r: -60 },
  { x: 69, s: 38, d: 20, t: 3, c: 1, r: 35 },
  { x: 76, s: 20, d: 18, t: 8, c: 3, r: -20 },
  { x: 83, s: 30, d: 22, t: 5, c: 2, r: 50 },
  { x: 90, s: 26, d: 17, t: 11, c: 0, r: -35 },
  { x: 96, s: 34, d: 21, t: 2, c: 1, r: 15 },
  { x: 22, s: 18, d: 24, t: 14, c: 4, r: 70 },
  { x: 72, s: 18, d: 25, t: 13, c: 2, r: -50 },
];

// Yashil ustun; bir-ikki tilla va qizg'ish barg — kuz kayfiyati
const COLORS = ['#3aa66a', '#1f8a4c', '#7bc99a', '#e3a634', '#d9772b'];

function Leaf({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden>
      <path d="M12 1.5C5.5 5.5 2.8 12 5 19.5c4.6 1.2 10-1 13-6.3 2.4-4.2 2.2-8.6 2-11.7-3.3.2-6.2.2-8 0Z" fill={color} />
      <path d="M5.5 19 13 9" stroke="rgba(255,255,255,0.45)" strokeWidth="1" fill="none" strokeLinecap="round" />
    </svg>
  );
}

/** Kirish sahifalari foni: o'rmon-yashil gradient, tushib turuvchi kuz barglari, sichqoncha ortidan siljuvchi yorug'lik. */
export function AuthBackdrop({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  function onMove(e: PointerEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
    el.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
    el.style.setProperty('--px', `${(e.clientX / r.width - 0.5) * 2}`);
    el.style.setProperty('--py', `${(e.clientY / r.height - 0.5) * 2}`);
  }

  return (
    <div className="auth-shell" ref={ref} onPointerMove={onMove}>
      <div className="auth-glow auth-glow-1" aria-hidden />
      <div className="auth-glow auth-glow-2" aria-hidden />
      <div className="auth-spot" aria-hidden />
      <LangSwitch className="lang-corner" />
      <div className="leaves" aria-hidden>
        {LEAVES.map((l, i) => (
          <span
            key={i}
            className="leaf"
            style={
              {
                left: `${l.x}%`,
                width: l.s,
                height: l.s,
                animationDuration: `${l.d}s`,
                animationDelay: `-${l.t}s`,
                '--rot': `${l.r}deg`,
              } as CSSProperties
            }
          >
            <Leaf color={COLORS[l.c] ?? '#1f8a4c'} />
          </span>
        ))}
      </div>
      {children}
    </div>
  );
}
