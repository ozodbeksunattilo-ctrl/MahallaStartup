import type { CSSProperties, ReactNode } from 'react';
import { NavIcon } from '@/components/NavIcon';
import { STATUS_STYLE } from '@/lib/status';

type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

interface BadgeProps {
  tone?: Tone;
  /** `<soha>:<HOLAT>` (lib/status.ts): holatga xos rang va ikonka beradi, `tone` e'tiborga olinmaydi */
  status?: string;
  children: ReactNode;
}

export function Badge({ tone = 'neutral', status, children }: BadgeProps) {
  const style = status ? STATUS_STYLE[status] : undefined;
  if (style) {
    return (
      <span className="badge badge-status" style={{ '--c': style.color } as CSSProperties}>
        <NavIcon name={style.icon} size={13} />
        {children}
      </span>
    );
  }
  const className = tone === 'neutral' ? 'badge' : `badge badge-${tone}`;
  return <span className={className}>{children}</span>;
}
