import type { Request, RequestHandler, Response, Router } from 'express';
import { z } from 'zod';
import { AppError } from '../common/app-error';
import { authenticate, authMeta, csrfGuard, CSRF_COOKIE, parseCookies, SESSION_COOKIE } from '../middleware/auth';
import { rateLimit } from '../middleware/rate-limit';
import { zodFields } from '../middleware/errors';
import { newToken, SESSION_TTL_MS } from '../modules/auth/session';
import type { Deps } from './deps';
import type { AuthUser } from './types';
import './zod-uz';

export type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';
/** public — kirishsiz; user — har qanday kirgan foydalanuvchi; resident / admin — rol bo'yicha */
export type AuthKind = 'public' | 'user' | 'resident' | 'admin';

export interface LimitSpec {
  name: string;
  limit: number;
  windowSec: number;
  by?: 'user' | 'ip';
}

export interface Ctx<P = undefined, Q = undefined, B = undefined> {
  req: Request;
  res: Response;
  deps: Deps;
  /** `auth: 'public'` marshrutlarda mavjud emas (ishlatmang) */
  user: AuthUser;
  params: P;
  query: Q;
  body: B;
  now: Date;
  /** Javob statusi (standart: spec.status ?? 200). Handler o'zgartirishi mumkin (masalan, idempotent qayta yuborishda 200). */
  status: number;
}

export interface RouteSpec<
  P extends z.ZodType = z.ZodUndefined,
  Q extends z.ZodType = z.ZodUndefined,
  B extends z.ZodType = z.ZodUndefined,
> {
  method: Method;
  /** `/api/v1` ga nisbatan */
  path: string;
  auth: AuthKind;
  tag: string;
  summary: string;
  description?: string;
  params?: P;
  query?: Q;
  body?: B;
  /** Faqat hujjat uchun (OpenAPI); runtime'da tekshirilmaydi */
  response?: z.ZodType;
  status?: number;
  /** `mustChangePassword` paytida ham ruxsat (faqat /me, change-password, logout) */
  allowWhileMustChange?: boolean;
  limit?: LimitSpec;
  handler: (ctx: Ctx<z.infer<P>, z.infer<Q>, z.infer<B>>) => unknown;
}

export interface AnyRoute {
  method: Method;
  path: string;
  auth: AuthKind;
  tag: string;
  summary: string;
  description?: string;
  params?: z.ZodType;
  query?: z.ZodType;
  body?: z.ZodType;
  response?: z.ZodType;
  status?: number;
  allowWhileMustChange?: boolean;
  limit?: LimitSpec;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: (ctx: Ctx<any, any, any>) => unknown;
}

export function route<
  P extends z.ZodType = z.ZodUndefined,
  Q extends z.ZodType = z.ZodUndefined,
  B extends z.ZodType = z.ZodUndefined,
>(spec: RouteSpec<P, Q, B>): AnyRoute {
  return spec as unknown as AnyRoute;
}

function parse<T extends z.ZodType>(schema: T, value: unknown): z.infer<T> {
  const r = schema.safeParse(value);
  if (!r.success) {
    throw new AppError('VALIDATION_ERROR', undefined, { fields: zodFields(r.error) });
  }
  return r.data;
}

export function setSessionCookies(
  res: Response,
  deps: Deps,
  token: string,
  csrf: string,
): void {
  const base = {
    sameSite: 'lax' as const,
    secure: deps.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_MS.WEB,
  };
  res.cookie(SESSION_COOKIE, token, { ...base, httpOnly: true });
  res.cookie(CSRF_COOKIE, csrf, { ...base, httpOnly: false });
}

export function clearSessionCookies(res: Response): void {
  res.clearCookie(SESSION_COOKIE, { path: '/' });
  res.clearCookie(CSRF_COOKIE, { path: '/' });
}

function handlerFor(spec: AnyRoute, deps: Deps): RequestHandler {
  return async (req, res) => {
    const now = deps.clock.now();
    let user: AuthUser | undefined;

    if (spec.auth !== 'public') {
      user = await authenticate(deps, req, now);
      await rateLimit(deps, { name: 'api', limit: deps.env.API_RATE_LIMIT, windowSec: 60, key: user.userId });
      csrfGuard(deps, req);
      if (spec.auth === 'admin' && user.role !== 'MAHALLA_ADMIN') throw new AppError('FORBIDDEN');
      if (spec.auth === 'resident' && user.role !== 'RESIDENT') throw new AppError('FORBIDDEN');
      if (user.mustChangePassword && !spec.allowWhileMustChange) {
        throw new AppError('PASSWORD_CHANGE_REQUIRED');
      }
      // Veb: sliding sessiya bilan ikkala cookie muddati ham uzaytiriladi
      // (aks holda 12 soatdan keyin CSRF cookie o'chib, sessiya tirik bo'lsa ham barcha o'zgartirishlar 403 bo'ladi)
      const meta = authMeta(req);
      if (meta?.refreshed && meta.via === 'cookie') {
        const csrf = parseCookies(req.headers.cookie)[CSRF_COOKIE];
        setSessionCookies(res, deps, meta.token, csrf || newToken());
      }
    }

    if (spec.limit) {
      const by = spec.limit.by ?? 'user';
      await rateLimit(deps, {
        name: spec.limit.name,
        limit: spec.limit.limit,
        windowSec: spec.limit.windowSec,
        key: by === 'ip' ? (req.ip ?? 'unknown') : (user?.userId ?? req.ip ?? 'unknown'),
      });
    }

    const params = spec.params ? parse(spec.params, req.params) : undefined;
    const query = spec.query ? parse(spec.query, req.query) : undefined;
    const body = spec.body ? parse(spec.body, req.body ?? {}) : undefined;

    const ctx: Ctx<unknown, unknown, unknown> = {
      req,
      res,
      deps,
      user: user as AuthUser,
      params,
      query,
      body,
      now,
      status: spec.status ?? 200,
    };

    const out = await spec.handler(ctx);
    if (res.headersSent) return;
    if (out === undefined) {
      res.status(ctx.status === 200 ? 204 : ctx.status).end();
      return;
    }
    res.status(ctx.status).json(out);
  };
}

/** Marshrutlar ro'yxatdan o'tish tartibi muhim: aniq yo'llar (`/issues/mine`) parametrlidan (`/issues/:id`) oldin. */
export function mountRoutes(router: Router, routes: readonly AnyRoute[], deps: Deps): void {
  const seen = new Set<string>();
  for (const spec of routes) {
    const key = `${spec.method.toUpperCase()} ${spec.path}`;
    if (seen.has(key)) throw new Error(`Takroriy marshrut: ${key}`);
    seen.add(key);
    router[spec.method](spec.path, handlerFor(spec, deps));
  }
}
