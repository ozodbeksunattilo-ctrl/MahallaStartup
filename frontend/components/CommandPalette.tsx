'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { NavIcon } from '@/components/NavIcon';
import { NAV_GROUPS } from '@/lib/nav';
import { LANGS, setLang, translate, useLang, type Lang } from '@/lib/i18n';

interface Command {
  id: string;
  label: string;
  group: string;
  icon?: string;
  run: (go: (href: string) => void) => void;
}

const CREATE: Command[] = [
  { id: 'new-resident', label: 'Yangi aholi', group: 'Yaratish', icon: 'users', run: (go) => go('/residents/new') },
  { id: 'new-event', label: 'Yangi tadbir', group: 'Yaratish', icon: 'calendar', run: (go) => go('/events/new') },
  { id: 'new-announcement', label: "Yangi e'lon", group: 'Yaratish', icon: 'megaphone', run: (go) => go('/announcements/new') },
];

/** Ctrl/⌘ + K: sahifalar va tezkor amallar bo'yicha qidiruv. Tugma yuqori panelda. */
export function CommandPalette() {
  const router = useRouter();
  const lang = useLang();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands = useMemo<Command[]>(() => {
    const pages = NAV_GROUPS.flatMap((g) =>
      g.items.map<Command>((i) => ({ id: i.href, label: i.label, group: g.title, icon: i.icon, run: (go) => go(i.href) })),
    );
    // One command per other language, named in that language
    const names: Record<Lang, string> = { uz: "O'zbek tiliga o'tish", ru: 'Перейти на русский', en: 'Switch to English' };
    const switches = LANGS.filter((l) => l.code !== lang).map<Command>((l) => ({
      id: `lang-${l.code}`,
      label: names[l.code],
      group: 'Amallar',
      icon: 'chat',
      run: () => setLang(l.code),
    }));
    return [...pages, ...CREATE, ...switches];
  }, [lang]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => c.label.toLowerCase().includes(q) || translate(c.label).toLowerCase().includes(q));
  }, [commands, query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function close() {
    setOpen(false);
    setQuery('');
    setActive(0);
  }

  function run(c: Command) {
    close();
    c.run((href) => router.push(href));
  }

  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(shown.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      const c = shown[active];
      if (c) run(c);
    }
  }

  return (
    <>
      <button type="button" className="cmd-trigger" onClick={() => setOpen(true)} aria-label="Qidirish">
        <NavIcon name="search" size={16} />
        <span className="cmd-trigger-text">Qidirish…</span>
        <kbd data-notranslate>Ctrl K</kbd>
      </button>
      {open ? (
        <div className="modal-backdrop cmd-backdrop" onClick={close} role="presentation">
          <div className="cmd-card" role="dialog" aria-modal="true" aria-label="Qidirish" onClick={(e) => e.stopPropagation()}>
            <div className="cmd-input-row">
              <NavIcon name="search" size={18} />
              <input
                ref={inputRef}
                className="cmd-input"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                onKeyDown={onInputKey}
                placeholder="Sahifa yoki amalni yozing…"
              />
              <kbd data-notranslate>Esc</kbd>
            </div>
            <ul className="cmd-list">
              {shown.length === 0 ? <li className="cmd-empty">Hech narsa topilmadi</li> : null}
              {shown.map((c, i) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className={i === active ? 'cmd-item active' : 'cmd-item'}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => run(c)}
                  >
                    <NavIcon name={c.icon} size={17} />
                    <span className="cmd-label">{c.label}</span>
                    <span className="cmd-group">{c.group}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </>
  );
}
