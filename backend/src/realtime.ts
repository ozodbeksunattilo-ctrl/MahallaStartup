import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import type { Deps, Realtime } from './core/deps';
import type { AuthUser } from './core/types';
import { parseCookies, SESSION_COOKIE } from './middleware/auth';
import { resolveSession } from './modules/auth/session';

const RECHECK_MS = 60_000;

/**
 * Socket.IO `/chat`: handshake'da sessiya tokeni (`auth.token` / Bearer) yoki cookie.
 * Xona (`mahalla:{id}`) serverda sessiyadan aniqlanadi — klient boshqa mahalla xonasiga ulana olmaydi.
 * Server faqat tarqatadi (`message:new`, `message:hidden`); xabar yuborish REST orqali.
 */
export async function createRealtime(httpServer: HttpServer, deps: Deps): Promise<Realtime> {
  const io = new Server(httpServer, {
    serveClient: false,
    cors: { origin: deps.env.WEB_ORIGINS, credentials: true },
  });

  const redisUrl = deps.env.REDIS_URL;
  let closeRedis: (() => void) | undefined;
  if (redisUrl) {
    const { createAdapter } = await import('@socket.io/redis-adapter');
    const { Redis } = await import('ioredis');
    const pub = new Redis(redisUrl);
    const sub = pub.duplicate();
    io.adapter(createAdapter(pub, sub));
    closeRedis = () => {
      pub.disconnect();
      sub.disconnect();
    };
  }

  const chat = io.of('/chat');

  chat.use(async (socket, next) => {
    try {
      const auth = socket.handshake.auth as { token?: string } | undefined;
      const header = socket.handshake.headers.authorization;
      const bearer = header?.startsWith('Bearer ') ? header.slice(7).trim() : undefined;
      const explicit = auth?.token ?? bearer;
      const token = explicit ?? parseCookies(socket.handshake.headers.cookie)[SESSION_COOKIE];
      if (!token) return next(new Error('UNAUTHENTICATED'));

      // Cookie bilan ulanishda Origin tekshiriladi (CSRF'ning socket analogi)
      if (!explicit) {
        const origin = socket.handshake.headers.origin;
        if (!origin || !deps.env.WEB_ORIGINS.includes(origin)) return next(new Error('FORBIDDEN'));
      }

      const resolved = await resolveSession(deps, token, deps.clock.now());
      if (!resolved || resolved.user.mustChangePassword) return next(new Error('UNAUTHENTICATED'));
      socket.data['user'] = resolved.user;
      socket.data['token'] = token;
      next();
    } catch {
      next(new Error('INTERNAL_ERROR'));
    }
  });

  chat.on('connection', (socket) => {
    const user = socket.data['user'] as AuthUser;
    void socket.join(`mahalla:${user.mahallaId}`);

    // Bloklangan/chiqqan foydalanuvchining ulanishi uzilsin
    const timer = setInterval(() => {
      // DB/Redis vaqtincha ishlamasa: rad etilgan promise jarayonni yiqitmasin, keyingi tikda qayta tekshiriladi
      resolveSession(deps, socket.data['token'] as string, deps.clock.now())
        .then((r) => {
          if (!r) socket.disconnect(true);
        })
        .catch(() => undefined);
    }, RECHECK_MS);
    timer.unref();
    socket.on('disconnect', () => clearInterval(timer));
  });

  return {
    emitToMahalla: (mahallaId, event, payload) => {
      chat.to(`mahalla:${mahallaId}`).emit(event, payload);
    },
    close: async () => {
      await io.close();
      closeRedis?.();
    },
  };
}
