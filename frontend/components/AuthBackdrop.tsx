import type { ReactNode } from 'react';
import { LangSwitch } from '@/components/LangSwitch';

/** Sign-in pages: a mahalla street photo beside the form, as on the landing. */
export function AuthBackdrop({ children }: { children: ReactNode }) {
  return (
    <div className="auth-shell">
      <figure className="auth-photo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/mahalla-street.webp" alt="" width={724} height={724} />
        <figcaption>Mahallamiz — bizning kuchimiz</figcaption>
      </figure>
      <main className="auth-main">
        <LangSwitch className="lang-corner" />
        {children}
      </main>
    </div>
  );
}
