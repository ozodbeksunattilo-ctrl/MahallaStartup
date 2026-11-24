'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { NavIcon } from '@/components/NavIcon';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  text?: ReactNode;
  /** Sarlavha ustidagi katta ikonka (components/NavIcon.tsx dagi nom) */
  icon?: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** danger — qizil tasdiqlash tugmasi */
  tone?: 'primary' | 'danger';
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Qiziqarli tasdiqlash oynasi: xira fon, sakrab chiquvchi karta, Esc bilan yopiladi. */
export function ConfirmModal({
  open,
  title,
  text,
  icon = 'leaf',
  confirmLabel,
  cancelLabel = 'Bekor qilish',
  tone = 'primary',
  busy,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={() => (busy ? undefined : onCancel())} role="presentation">
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-icon" aria-hidden>
          <NavIcon name={icon} size={34} />
        </div>
        <h2 id="modal-title" className="modal-title">
          {title}
        </h2>
        {text ? <p className="modal-text">{text}</p> : null}
        <div className="modal-actions">
          <button ref={cancelRef} type="button" className="modal-btn modal-btn-ghost" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={tone === 'danger' ? 'modal-btn modal-btn-danger' : 'modal-btn modal-btn-primary'}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? <span className="lg-spin" aria-hidden /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
