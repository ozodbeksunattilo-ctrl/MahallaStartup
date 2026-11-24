import type { ReactNode } from 'react';
import { AppLeaves } from '@/components/AppLeaves';
import { AuthGate } from '@/components/AuthGate';
import { Sidebar } from '@/components/Sidebar';
import { Spotlight } from '@/components/Spotlight';
import { Topbar } from '@/components/Topbar';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <AppLeaves />
      <Spotlight />
      <Sidebar />
      <div className="main">
        <Topbar />
        <main className="content">
          <AuthGate>{children}</AuthGate>
        </main>
      </div>
    </div>
  );
}
