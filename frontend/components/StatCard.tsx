import Link from 'next/link';
import { AnimatedValue } from '@/components/AnimatedValue';
import { NavIcon } from '@/components/NavIcon';

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  href?: string;
  /** Kartaning urg'u rangi */
  tone?: 'blue' | 'green' | 'amber' | 'red';
  /** components/NavIcon.tsx dagi ikonka nomi */
  icon?: string;
  /** 0–100: berilsa, qiymat ostida progress chizig'i chiqadi */
  progress?: number;
}

export function StatCard({ label, value, hint, href, tone = 'blue', icon, progress }: StatCardProps) {
  const body = (
    <>
      <div className="stat-top">
        <div className="stat-label">{label}</div>
        {icon ? (
          <span className="stat-icon">
            <NavIcon name={icon} size={20} />
          </span>
        ) : null}
      </div>
      <div className="stat-value">
        <AnimatedValue key={value} value={value} />
      </div>
      {progress !== undefined ? (
        <div className="stat-bar" aria-hidden>
          <i style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
        </div>
      ) : null}
      {hint ? <div className="stat-hint">{hint}</div> : null}
    </>
  );
  const cls = `stat stat-${tone}`;
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
