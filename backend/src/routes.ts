import type { AnyRoute } from './core/http';
import { adminRoutes } from './modules/admin/routes';
import { appRoutes } from './modules/app/routes';
import { accessRequestRoutes } from './modules/access-requests/routes';
import { announcementRoutes } from './modules/announcements/routes';
import { authRoutes } from './modules/auth/routes';
import { chatRoutes } from './modules/chat/routes';
import { eventRoutes } from './modules/events/routes';
import { homeRoutes } from './modules/home/routes';
import { adminIssueRoutes } from './modules/issues/admin-routes';
import { issueRoutes } from './modules/issues/routes';
import { mediaRoutes } from './modules/media/routes';
import { moderationRoutes } from './modules/moderation/routes';
import { notificationRoutes } from './modules/notifications/routes';
import { residentRoutes } from './modules/residents/routes';
import { roundRoutes } from './modules/rounds/routes';
import { supportRoutes } from './modules/support/routes';

/**
 * Marshrutlar tartibi muhim (Express ketma-ket moslaydi): aniq yo'llar (`/issues/mine`) parametrli
 * yo'llardan (`/issues/:id`) OLDIN turadi — `issueRoutes` ichida shunday.
 * OpenAPI shartnomasi (`pnpm contract:build`) ham aynan shu ro'yxatdan generatsiya qilinadi.
 */
export const allRoutes: AnyRoute[] = [
  ...appRoutes,
  ...authRoutes,
  ...accessRequestRoutes,
  ...homeRoutes,
  ...issueRoutes,
  ...roundRoutes,
  ...mediaRoutes,
  ...chatRoutes,
  ...supportRoutes,
  ...moderationRoutes,
  ...eventRoutes,
  ...announcementRoutes,
  ...notificationRoutes,
  ...residentRoutes,
  ...adminIssueRoutes,
  ...adminRoutes,
];
