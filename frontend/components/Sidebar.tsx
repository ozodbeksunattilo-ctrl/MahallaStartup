'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { NavIcon } from '@/components/NavIcon';
import { NAV_GROUPS } from '@/lib/nav';
import { toggleSidebar, useSidebarCollapsed } from '@/lib/prefs';

export function Sidebar() {
  const pathname = usePathname();
  const collapsed = useSidebarCollapsed();

  // Yig'ilgan holat CSS orqali butun qobiqqa ta'sir qiladi
  useEffect(() => {
    document.documentElement.dataset.sidebar = collapsed ? 'collapsed' : 'open';
  }, [collapsed]);

  return (
    <aside className="sidebar">
      <Link href="/dashboard" className="brand">
        <span className="brand-chip">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.png" alt="" className="brand-logo" />
        </span>
        <span className="brand-name">Mahalladosh</span>
      </Link>
      <nav>
        {NAV_GROUPS.map((group) => (
          <div className="nav-group" key={group.title}>
            <div className="nav-title">{group.title}</div>
            {group.items.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={active ? 'nav-link active' : 'nav-link'}
                  title={collapsed ? item.label : undefined}
                >
                  <NavIcon name={item.icon} />
                  <span className="nav-label">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <button
        type="button"
        className="sidebar-toggle"
        onClick={toggleSidebar}
        aria-label={collapsed ? 'Menyuni ochish' : "Menyuni yig'ish"}
      >
        <NavIcon name={collapsed ? 'chevron-right' : 'chevron-left'} size={16} />
        <span className="nav-label">Yig&apos;ish</span>
      </button>
    </aside>
  );
}
