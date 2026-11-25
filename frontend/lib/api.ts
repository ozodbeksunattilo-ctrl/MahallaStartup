/** Server xato javobi (docs/FOR_CLIENTS.md). `api:types` dan keyin generatsiya qilingan tipga almashtirish mumkin. */
interface ErrorResponse {
  error: { code: string; message: string; details: Record<string, unknown> };
}

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

function csrfToken(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  return document.cookie
    .split('; ')
    .find((c) => c.startsWith('mhd_csrf='))
    ?.split('=')[1];
}

type ApiInit = Omit<RequestInit, 'body'> & { json?: unknown };

/**
 * `/api/v1/*` ga so'rov. Next `rewrites` uni API'ga proksi qiladi (bitta origin).
 * Cookie sessiya + o'zgartiruvchi so'rovlarda `X-CSRF-Token` (double-submit).
 */
export async function api<T = void>(path: string, init: ApiInit = {}): Promise<T> {
  const { json, headers, ...rest } = init;
  const method = (rest.method ?? 'GET').toUpperCase();
  const h = new Headers(headers);
  if (json !== undefined) h.set('Content-Type', 'application/json');
  if (method !== 'GET' && method !== 'HEAD') {
    const token = csrfToken();
    if (token) h.set('X-CSRF-Token', token);
  }

  const res = await fetch(`/api/v1${path}`, {
    ...rest,
    method,
    headers: h,
    credentials: 'include',
    body: json !== undefined ? JSON.stringify(json) : undefined,
  });

  if (res.status === 204) return undefined as T;
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const err = (data as ErrorResponse | null)?.error;
    // Sessiya tugagan/bekor qilingan: istalgan sahifadan login'ga (login formasining o'z xatosi bundan mustasno)
    if (res.status === 401 && err?.code === 'UNAUTHENTICATED' && typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.replace('/login');
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
