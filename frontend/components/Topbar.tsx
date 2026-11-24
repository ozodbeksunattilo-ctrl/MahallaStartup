'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CommandPalette } from '@/components/CommandPalette';
import { ConfirmModal } from '@/components/ConfirmModal';
import { LangSwitch } from '@/components/LangSwitch';
import { api } from '@/lib/api';
import { useFetch } from '@/lib/hooks';

interface Me {
  user?: { displayName?: string; login?: string };
  mahalla?: { name?: string };
}

export function Topbar() {
  const router = useRouter();
  const { data: me } = useFetch<Me>('/me');
  const [askLogout, setAskLogout] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const name = me?.user?.displayName ?? me?.user?.login ?? 'Mahalla admini';
  const initial = name.trim().charAt(0).toUpperCase() || 'A';

  async function logout() {
    setLeaving(true);
    try {
      await api('/auth/logout', { method: 'POST' });
    } finally {
      // Qisqa «Ko'rishguncha» lahzasi, keyin login sahifasi
      setTimeout(() => {
        router.replace('/login');
        router.refresh();
      }, 900);
    }
  }

  return (
    <div className="topbar">
      <div className="topbar-who">
        <span className="avatar" aria-hidden>
          {initial}
        </span>
        <span className="who-text">
          <strong>{name}</strong>
          <small>{me?.mahalla?.name ?? 'Mahalla admini'}</small>
        </span>
      </div>
      <CommandPalette />
      <LangSwitch />
      <Link href="/change-password" className="btn btn-ghost">
        Parolni almashtirish
      </Link>
      <button type="button" className="btn" onClick={() => setAskLogout(true)}>
        Chiqish
      </button>

      <ConfirmModal
        open={askLogout}
        icon={leaving ? 'leaf' : 'logout'}
        title={leaving ? "Ko'rishguncha!" : 'Chiqmoqchimisiz?'}
        text={
          leaving
            ? 'Sessiya yopilmoqda… Yana kutib qolamiz.'
            : `${name}, tizimdan chiqsangiz, qayta kirish uchun login va parol kerak bo'ladi.`
        }
        confirmLabel="Ha, chiqaman"
        cancelLabel="Qolaman"
        tone="danger"
        busy={leaving}
        onConfirm={() => void logout()}
        onCancel={() => setAskLogout(false)}
      />
    </div>
  );
}
