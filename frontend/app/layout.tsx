import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Translator } from '@/components/Translator';
import './globals.css';
import './polish.css';

export const metadata: Metadata = {
  title: { default: 'Mahalladosh Admin', template: '%s · Mahalladosh' },
  description: 'Mahalla adminlari uchun boshqaruv paneli',
  icons: { icon: '/favicon.png' },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="uz">
      <body>
        {children}
        <Translator />
      </body>
    </html>
  );
}
