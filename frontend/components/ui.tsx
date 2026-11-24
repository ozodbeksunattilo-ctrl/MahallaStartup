'use client';
import {
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  Clock,
  Eye,
  EyeOff,
  Inbox,
  Link2,
  PenLine,
  RotateCw,
  Send,
  Trophy,
  Vote,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import type { ApiError } from '@/lib/api';
import { STATUS_LABEL } from '@/lib/rules';
import type { IssueStatus } from '@/lib/types';

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm';
  loading?: boolean;
  icon?: LucideIcon;
};

export function Button({ variant = 'secondary', size, loading, icon: Icon, children, disabled, className = '', ...rest }: BtnProps) {
  return (
    <button
      type="button"
      className={`btn btn-${variant} ${size ? 'btn-sm' : ''} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <span className="spin" aria-hidden /> : Icon && <Icon size={18} aria-hidden />}
      {children}
    </button>
  );
}

// Rang yagona belgi emas: har holatda ikonka + matn bor.
const STATUS_STYLE: Record<IssueStatus, [LucideIcon, string]> = {
  PENDING_REVIEW: [Clock, 'pending'],
  REJECTED: [PenLine, 'rejected'],
  MERGED: [Link2, 'pending'],
  OPEN: [Vote, 'voting'],
  SELECTED: [Trophy, 'selected'],
  IN_PROGRESS: [Wrench, 'progress'],
  REFERRED: [Send, 'referred'],
  RESOLVED: [CheckCircle2, 'resolved'],
};

/** label — backend bergan `statusLabel` (bo'lmasa lokal nom). */
export function StatusBadge({ status, label }: { status: IssueStatus; label?: string }) {
  const [Icon, key] = STATUS_STYLE[status] ?? [CircleDot, 'open'];
  return (
    <span className="badge" style={{ color: `var(--s-${key})`, background: `var(--s-${key}-bg)` }}>
      <Icon aria-hidden />
      {label ?? STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function PageHead({ title, sub, children }: { title: string; sub?: string; children?: ReactNode }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {children && <div className="row">{children}</div>}
    </div>
  );
}

export function Loading({ rows = 3 }: { rows?: number }) {
  return (
    <div className="stack" role="status" aria-label="Yuklanmoqda">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skel" />
      ))}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="state">
      <Inbox aria-hidden />
      <b style={{ color: 'var(--ink)' }}>{title}</b>
      {children}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: ApiError | Error; onRetry?: () => void }) {
  return (
    <div className="state" role="alert">
      <AlertTriangle aria-hidden style={{ color: 'var(--danger)' }} />
      <b style={{ color: 'var(--ink)' }}>Ma’lumotni yuklab bo‘lmadi</b>
      <span>{error.message}</span>
      {onRetry && (
        <Button icon={RotateCw} onClick={onRetry}>
          Qayta urinish
        </Button>
      )}
    </div>
  );
}

/** Ro'yxat/sahifa uchun: loading → error → empty → content. */
export function Async<T>({
  q,
  empty,
  isEmpty,
  rows,
  children,
}: {
  q: { data: T | null; error: ApiError | null; loading: boolean; reload: () => void };
  empty?: ReactNode;
  isEmpty?: (d: T) => boolean;
  rows?: number;
  children: (d: T) => ReactNode;
}) {
  if (q.error) return <ErrorState error={q.error} onRetry={q.reload} />;
  if (!q.data) return <Loading rows={rows} />;
  if (isEmpty?.(q.data)) return <>{empty}</>;
  return <>{children(q.data)}</>;
}

/** usePaged ro'yxati ostida: keyingi sahifa bo'lsa tugma, xato bo'lsa xabar. */
export function LoadMore({ q }: { q: { data: { nextCursor: string | null } | null; loadMore: () => void; loadingMore: boolean; moreError: ApiError | null } }) {
  if (!q.data?.nextCursor) return null;
  return (
    <div className="stack" style={{ justifyItems: 'center', marginTop: 16 }}>
      {q.moreError && <Notice kind="error">{q.moreError.message}</Notice>}
      <Button icon={q.moreError ? RotateCw : undefined} loading={q.loadingMore} onClick={q.loadMore}>
        {q.moreError ? 'Qayta urinish' : 'Yana yuklash'}
      </Button>
    </div>
  );
}

export function Notice({ kind, children }: { kind: 'error' | 'info' | 'ok' | 'warn'; children: ReactNode }) {
  const Icon = kind === 'ok' ? CheckCircle2 : kind === 'info' ? CircleDot : AlertTriangle;
  return (
    <div className={`notice notice-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      <Icon size={18} aria-hidden />
      <div>{children}</div>
    </div>
  );
}

type FieldProps = {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  textarea?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement> &
  React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Field({ label, name, error, hint, textarea, ...rest }: FieldProps) {
  const id = `f-${name}`;
  const [show, setShow] = useState(false);
  const describedBy = [hint && `${id}-h`, error && `${id}-e`].filter(Boolean).join(' ') || undefined;
  const common = { id, name, 'aria-invalid': !!error || undefined, 'aria-describedby': describedBy };
  const isPassword = !textarea && rest.type === 'password';
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {textarea ? (
        <textarea className="textarea" {...common} {...rest} />
      ) : isPassword ? (
        <div className="pw">
          <input className="input" {...common} {...rest} type={show ? 'text' : 'password'} />
          <button type="button" className="pw-toggle" onClick={() => setShow(!show)} aria-label={show ? 'Parolni yashirish' : 'Parolni ko‘rsatish'} aria-pressed={show} aria-controls={id}>
            {show ? <EyeOff size={20} aria-hidden /> : <Eye size={20} aria-hidden />}
          </button>
        </div>
      ) : (
        <input className="input" {...common} {...rest} />
      )}
      {hint && (
        <span className="hint" id={`${id}-h`}>
          {hint}
        </span>
      )}
      {error && (
        <span className="err" id={`${id}-e`}>
          {error}
        </span>
      )}
    </div>
  );
}

/** Native <dialog>: Esc yopadi, fokus ichida qoladi. */
export function Modal({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      // showModal fokusni "Yopish" tugmasiga beradi; birinchi maydonga o'tkazamiz
      d.querySelector<HTMLElement>('.dlg-body :is(input:not([type=hidden]):not([hidden]), textarea, select)')?.focus();
    }
    if (!open && d.open) d.close();
  }, [open]);
  return (
    // Faqat foydalanuvchi yopganda (Esc) onClose; open=false bo'lib o'zimiz yopganimizda emas
    <dialog ref={ref} onClose={() => open && onClose()} aria-labelledby="dlg-title">
      {open && (
        <>
          <div className="dlg-head">
            <h2 id="dlg-title">{title}</h2>
            <Button variant="ghost" size="sm" icon={X} onClick={onClose} aria-label="Yopish" />
          </div>
          <div className="dlg-body">{children}</div>
          {footer && <div className="dlg-foot">{footer}</div>}
        </>
      )}
    </dialog>
  );
}
