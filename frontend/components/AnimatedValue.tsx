'use client';

import { useEffect, useState } from 'react';

const DURATION = 900;

/** Qiymatdagi butun sonlarni 0 dan sanab chiqadi («3 / 4» -> «0 / 0» -> «3 / 4»). Raqamsiz matn o'zgarishsiz chiqadi. */
export function AnimatedValue({ value }: { value: string }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!/\d/.test(value)) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = reduce ? 1 : Math.min(1, (now - start) / DURATION);
      setProgress(1 - Math.pow(1 - t, 3));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  if (!/\d/.test(value)) return <>{value}</>;
  return <>{value.replace(/\d+/g, (n) => String(Math.round(Number(n) * progress)))}</>;
}
