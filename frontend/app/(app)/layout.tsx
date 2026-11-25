import type { ReactNode } from 'react';
import { AuthGate } from '@/components/AuthGate';
import { Sidebar } from '@/components/Sidebar';
import { Topbar } from '@/components/Topbar';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
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
