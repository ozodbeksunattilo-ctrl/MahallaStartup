'use client';

import { Fragment, useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { api } from '@/lib/api';
import { useFetch } from '@/lib/hooks';

interface ChatMessage {
  id: string;
  text: string;
  senderName: string;
  senderRole: 'RESIDENT' | 'MAHALLA_ADMIN';
  mine: boolean;
  createdAt: string;
}

interface Thread {
  residentId: string;
  residentName: string;
  lastText: string;
  lastAt: string;
  awaitingReply: boolean;
}

const POLL_MS = 3000;
const GENERAL = 'general';

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tashkent' });

const day = (iso: string) => new Date(iso).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'long', timeZone: 'Asia/Tashkent' });

const messagesPath = (selected: string) =>
  selected === GENERAL ? '/chat/messages' : `/admin/support/threads/${selected}/messages`;

// Umumiy mahalla chati: GET/POST /chat/messages · Aholi bilan shaxsiy suhbat: /admin/support/threads/*
export default function ChatPage() {
  const threadsQuery = useFetch<{ items: Thread[] }>('/admin/support/threads', 5000);
  const threads = threadsQuery.data?.items ?? [];
  const [selected, setSelected] = useState<string>(GENERAL);
  // Har suhbat o'z xabarlari va oxirgi id'si bilan saqlanadi: suhbat almashganda tozalash kerak emas
  const [byConv, setByConv] = useState<Record<string, ChatMessage[]>>({});
  const lastIds = useRef<Record<string, string | undefined>>({});
  const messages = byConv[selected] ?? [];
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const conv = selected;
    const last = lastIds.current[conv];
    try {
      const base = messagesPath(conv);
      const path = last ? `${base}?after=${last}&limit=100` : `${base}?limit=100`;
      const res = await api<{ items: ChatMessage[] }>(path);
      setError(null);
      if (res.items.length === 0) return;
      // Birinchi yuklash yangisidan eskisiga, `after` esa eskisidan yangisiga qaytadi
      const ordered = last ? res.items : [...res.items].reverse();
      setByConv((prev) => {
        const current = prev[conv] ?? [];
        const known = new Set(current.map((m) => m.id));
        return { ...prev, [conv]: [...current, ...ordered.filter((m) => !known.has(m.id))] };
      });
      lastIds.current[conv] = ordered[ordered.length - 1]?.id ?? last;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yuklab bo'lmadi");
    }
  }, [selected]);

  useEffect(() => {
    // Serverdan yuklash va so'rovni takrorlash; setState faqat javob kelgach chaqiriladi
    // oxlint-disable-next-line react/set-state-in-effect
    void load();
    const t = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, selected]);

  async function send(e: FormEvent) {
    e.preventDefault();
    const value = text.trim();
    if (!value || sending) return;
    setSending(true);
    try {
      await api(messagesPath(selected), { method: 'POST', json: { text: value, clientMessageId: crypto.randomUUID() } });
      setText('');
      await load();
      void threadsQuery.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Yuborib bo'lmadi");
    } finally {
      setSending(false);
    }
  }

  const title = selected === GENERAL ? 'Mahalla chati' : (threads.find((t) => t.residentId === selected)?.residentName ?? 'Suhbat');

  return (
    <>
      <PageHeader title="Chat" description="Aholining adminga yozgan xabarlari va umumiy mahalla chati" />
      <div className="chat-layout">
        <aside className="chat-threads">
          <button
            type="button"
            className={`chat-thread${selected === GENERAL ? ' active' : ''}`}
            onClick={() => setSelected(GENERAL)}
          >
            <strong>Mahalla chati</strong>
            <span className="muted">Umumiy kanal</span>
          </button>
          {threads.length === 0 ? <p className="muted chat-empty">Hali shaxsiy murojaat yo&apos;q.</p> : null}
          {threads.map((t) => (
            <button
              type="button"
              key={t.residentId}
              className={`chat-thread${selected === t.residentId ? ' active' : ''}`}
              onClick={() => setSelected(t.residentId)}
            >
              <strong>
                {t.residentName}
                {t.awaitingReply ? <span className="chat-dot" title="Javob kutmoqda" /> : null}
              </strong>
              <span className="muted chat-last">{t.lastText}</span>
            </button>
          ))}
        </aside>

        <section className="chat-pane">
          <h2 className="chat-title">{title}</h2>
          <div className="chat-box">
            {messages.length === 0 ? <p className="muted">Hali xabar yo&apos;q.</p> : null}
            {messages.map((m, i) => (
              <Fragment key={m.id}>
              {i === 0 || day(messages[i - 1]!.createdAt) !== day(m.createdAt) ? <div className="chat-day">{day(m.createdAt)}</div> : null}
              <div className={`chat-row${m.mine ? ' mine' : ''}${m.senderRole === 'MAHALLA_ADMIN' ? ' admin' : ''}`}>
                {!m.mine ? <span className="chat-meta">{m.senderName}</span> : null}
                <div className="chat-bubble">{m.text}</div>
                <span className="chat-meta">{time(m.createdAt)}</span>
              </div>
              </Fragment>
            ))}
            <div ref={endRef} />
          </div>
          {error ? <p style={{ color: 'var(--danger)' }}>{error}</p> : null}
          <form className="chat-form" onSubmit={(e) => void send(e)}>
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Xabar yozing…" maxLength={1000} />
            <button type="submit" className="btn btn-primary" disabled={!text.trim() || sending}>
              Yuborish
            </button>
          </form>
        </section>
      </div>
    </>
  );
}
