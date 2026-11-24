'use client';

import { useState } from 'react';

interface ReasonActionProps {
  label: string;
  placeholder?: string;
  danger?: boolean;
  disabled?: boolean;
  onSubmit: (reason: string) => void | Promise<void>;
}

/** Sabab so'raydigan tugma: bosilganda matn maydoni ochiladi (3–500 belgi), so'ng tasdiqlanadi. */
export function ReasonAction({ label, placeholder = 'Sabab (3–500 belgi)', danger, disabled, onSubmit }: ReasonActionProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');

  if (!open) {
    return (
      <button type="button" className={`btn${danger ? ' btn-danger' : ''}`} disabled={disabled} onClick={() => setOpen(true)}>
        {label}
      </button>
    );
  }
  const valid = reason.trim().length >= 3;
  return (
    <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
      <input
        className="input"
        autoFocus
        value={reason}
        placeholder={placeholder}
        maxLength={500}
        onChange={(e) => setReason(e.target.value)}
        style={{ minWidth: 220 }}
      />
      <button
        type="button"
        className={`btn${danger ? ' btn-danger' : ' btn-primary'}`}
        disabled={!valid || disabled}
        onClick={async () => {
          await onSubmit(reason.trim());
          setOpen(false);
          setReason('');
        }}
      >
        {label}
      </button>
      <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
        Bekor
      </button>
    </span>
  );
}
