import type { Metadata } from 'next';
import { Lora, Onest } from 'next/font/google';
import type { ReactNode } from 'react';
import { Translator } from '@/components/Translator';
import './globals.css';

// Same type as the landing: Lora for headings, Onest for text
const serif = Lora({ subsets: ['latin', 'cyrillic'], weight: '500', style: ['normal', 'italic'], variable: '--next-serif' });
const sans = Onest({ subsets: ['latin', 'cyrillic'], variable: '--next-sans' });

export const metadata: Metadata = {
  title: { default: 'Mahalladosh Admin', template: '%s · Mahalladosh' },
  description: 'Mahalla adminlari uchun boshqaruv paneli',
  icons: { icon: '/favicon.png' },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="uz" className={`${serif.variable} ${sans.variable}`}>
      <body>
        {children}
        <Translator />
      </body>
    </html>
  );
}
