export interface NavItem {
  href: string;
  label: string;
  /** components/NavIcon.tsx dagi ikonka nomi */
  icon?: string;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Umumiy',
    items: [
      { href: '/dashboard', label: 'Bosh sahifa', icon: 'home' },
      { href: '/chat', label: 'Chat', icon: 'chat' },
    ],
  },
  {
    title: 'Moderatsiya',
    items: [
      { href: '/moderation', label: 'Moderatsiya navbati', icon: 'shield' },
      { href: '/reports', label: 'Shikoyatlar', icon: 'flag' },
    ],
  },
  {
    title: 'Muammolar',
    items: [
      { href: '/issues', label: 'Barcha muammolar', icon: 'list' },
      { href: '/rounds', label: 'Ovoz davrlari', icon: 'vote' },
    ],
  },
  {
    title: 'Mahalla',
    items: [
      { href: '/access-requests', label: "Kirish so'rovlari", icon: 'key' },
      { href: '/residents', label: 'Aholi', icon: 'users' },
      { href: '/events', label: 'Tadbirlar', icon: 'calendar' },
      { href: '/announcements', label: "E'lonlar", icon: 'megaphone' },
    ],
  },
  { title: 'Tizim', items: [{ href: '/audit', label: 'Audit jurnali', icon: 'log' }] },
];
