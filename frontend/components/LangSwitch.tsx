'use client';

import { LANGS, setLang, useLang } from '@/lib/i18n';

/** UZ | RU tanlagich (tanlov brauzerda saqlanadi). */
export function LangSwitch({ className = '' }: { className?: string }) {
  const lang = useLang();
  return (
    <div className={`lang-switch ${className}`.trim()} role="group" aria-label="Til" data-notranslate>
      {LANGS.map((l) => (
        <button
          key={l.code}
          type="button"
          className={l.code === lang ? 'lang-btn active' : 'lang-btn'}
          aria-pressed={l.code === lang}
          onClick={() => setLang(l.code)}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
