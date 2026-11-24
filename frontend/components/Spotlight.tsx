'use client';

import { useEffect } from 'react';

const TARGETS = '.stat, .card, .quick-link';

/** Kartalar ustida sichqoncha yorug'ligi: kursor o'rnini CSS o'zgaruvchilar (--sx, --sy) orqali beradi. */
export function Spotlight() {
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest<HTMLElement>(TARGETS);
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty('--sx', `${e.clientX - r.left}px`);
      el.style.setProperty('--sy', `${e.clientY - r.top}px`);
    };
    document.addEventListener('pointermove', onMove, { passive: true });
    return () => document.removeEventListener('pointermove', onMove);
  }, []);
  return null;
}
