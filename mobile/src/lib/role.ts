import { useFetch } from './hooks';
import type { Me } from './types';

/**
 * Joriy foydalanuvchi roli. Ovoz berish va muammo yuborish backend'da faqat aholi uchun (admin -> 403),
 * shuning uchun admin'ga bu tugmalar ko'rsatilmaydi. `/me` keshdan darhol olinadi.
 */
export function useRole(): { isAdmin: boolean; loaded: boolean } {
  const me = useFetch<Me>('/me');
  return { isAdmin: me.data?.role === 'MAHALLA_ADMIN', loaded: me.data !== null };
}

export const ADMIN_READONLY_HINT =
  "Admin akkaunti: ovoz berish va muammo yuborish faqat aholi uchun. Moderatsiya veb-panelda.";
