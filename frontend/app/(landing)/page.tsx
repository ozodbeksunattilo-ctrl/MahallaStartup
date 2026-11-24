import type { Metadata } from 'next';
import { Landing } from '@/components/landing/Landing';
import './landing.css';

export const metadata: Metadata = {
  title: { absolute: 'Mahalladosh — mahalla ovozi bitta ilovada' },
  description:
    "Muammoni yuboring, oyiga 3 ta ovoz bering, hal bo'lishini kuzating. Mahalla aholisi va adminlari uchun yagona platforma.",
};

export default function LandingPage() {
  return <Landing />;
}
