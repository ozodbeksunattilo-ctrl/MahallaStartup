/** Server xato javobi (docs/FOR_CLIENTS.md). `api:types` dan keyin generatsiya qilingan tipga almashtirish mumkin. */
interface ErrorResponse {
  error: { code: string; message: string; details: Record<string, unknown> };
}
import { API_URL, DEMO } from './config';
import { log } from './log';
import { mockResponse } from './mock';
import { getToken } from './token';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

interface SessionHandlers {
  /** 401 UNAUTHENTICATED: sessiya tozalanib login ekraniga qaytiladi */
  onUnauthorized?: () => void;
  /** 403 PASSWORD_CHANGE_REQUIRED: parol almashtirish ekraniga yo'naltiriladi */
  onPasswordChangeRequired?: () => void;
}

let handlers: SessionHandlers = {};

/** SessionProvider ro'yxatdan o'tkazadi. */
export function setSessionHandlers(next: SessionHandlers): void {
  handlers = next;
}

type ApiInit = Omit<RequestInit, 'body'> & {
  json?: unknown;
  /** multipart/form-data (media yuklash); Content-Type avtomatik qo'yiladi */
  form?: FormData;
  /** Post yaratish kabi idempotent so'rovlar uchun */
  idempotencyKey?: string;
};

export async function api<T = void>(path: string, init: ApiInit = {}): Promise<T> {
  try {
    return await request<T>(path, init);
  } catch (e) {
    // Faqat dev rejimida: server javob bermasa o'qish so'rovlarida namunaviy (mock) ma'lumot ko'rsatiladi.
    // Haqiqiy build'da soxta ma'lumot ko'rsatilmaydi — aks holda ulanish yo'qligi «ishlayapti» bo'lib ko'rinadi.
    const method = init.method ?? 'GET';
    if (__DEV__ && method === 'GET' && e instanceof ApiError && (e.status === 0 || e.status >= 500)) {
      const demo = mockResponse(path, 'GET');
      if (demo !== undefined) {
        log.warn('api', `GET ${path} -> ${e.status}: namunaviy ma'lumot ko'rsatilmoqda`);
        return demo as T;
      }
    }
    throw e;
  }
}

async function request<T>(path: string, init: ApiInit): Promise<T> {
  if (DEMO) {
    await new Promise((r) => setTimeout(r, 250));
    return mockResponse(path, init.method ?? 'GET', init.json) as T;
  }
  const { json, form, idempotencyKey, headers, ...rest } = init;
  const h = new Headers(headers);
  h.set('Accept', 'application/json');
  if (json !== undefined) h.set('Content-Type', 'application/json');
  if (idempotencyKey) h.set('Idempotency-Key', idempotencyKey);
  const token = getToken();
  if (token) h.set('Authorization', `Bearer ${token}`);

  const method = rest.method ?? 'GET';
  const started = Date.now();
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/v1${path}`, {
      ...rest,
      headers: h,
      body: form ?? (json !== undefined ? JSON.stringify(json) : undefined),
    });
  } catch (e) {
    log.error('api', `${method} ${path} -> tarmoq xatosi (${API_URL})`, e instanceof Error ? e.message : e);
    throw new ApiError(0, 'NETWORK_ERROR', "Internetga ulanib bo'lmadi");
  }

  log.info('api', `${method} ${path} -> ${res.status} (${Date.now() - started}ms)`);
  if (res.status === 204) return undefined as T;
  const data: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const err = (data as ErrorResponse | null)?.error;
    // Faqat 401 sessiyani tozalaydi; 403 FORBIDDEN (masalan, admin uchun yopiq amal) foydalanuvchini chiqarib yubormaydi
    if (res.status === 401 && err?.code === 'UNAUTHENTICATED') {
      handlers.onUnauthorized?.();
    }
    if (res.status === 403 && err?.code === 'PASSWORD_CHANGE_REQUIRED') {
      handlers.onPasswordChangeRequired?.();
    }
    throw new ApiError(
      res.status,
      err?.code ?? 'INTERNAL_ERROR',
      err?.message ?? 'Kutilmagan xato yuz berdi',
      err?.details ?? {},
    );
  }
  return data as T;
}

/** `Idempotency-Key` / `clientUploadId` / `clientMessageId` uchun UUID v4 ko'rinishidagi kalit. */
export function newKey(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
