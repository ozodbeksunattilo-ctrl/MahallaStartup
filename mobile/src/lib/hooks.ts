import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, api } from './api';
import type { Page } from './types';

export function errorMessage(e: unknown): string {
  if (!(e instanceof ApiError)) return 'Kutilmagan xato yuz berdi';
  // VALIDATION_ERROR: umumiy matn o'rniga aniq maydon xatosi (masalan, «Joriy parol noto'g'ri»)
  const fields = (e.details as { fields?: Record<string, string> }).fields;
  const first = fields ? Object.values(fields)[0] : undefined;
  return first ?? e.message;
}

// Ekranlar orasida qaytganda darhol ko'rsatish uchun oddiy xotira keshi (stale-while-revalidate)
const cache = new Map<string, unknown>();
/** Chiqishda (logout) boshqa foydalanuvchi ma'lumoti ko'rinmasligi uchun */
export function clearFetchCache() {
  cache.clear();
}

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  reload: () => Promise<void>;
  refresh: () => Promise<void>;
  setData: (updater: (prev: T | null) => T | null) => void;
}

/** Bitta GET so'rov: yuklanish, xato, qayta urinish va pull-to-refresh holatlari bilan. */
export function useFetch<T>(path: string | null): FetchState<T> {
  const cached = path !== null ? (cache.get(path) as T | undefined) : undefined;
  const [data, setDataState] = useState<T | null>(cached ?? null);
  const [loading, setLoading] = useState(path !== null && cached === undefined);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  const run = useCallback(
    async (silent: boolean) => {
      if (path === null) return;
      const id = ++seq.current;
      const hit = cache.get(path) as T | undefined;
      if (!silent) {
        setLoading(hit === undefined);
        setDataState(hit ?? null);
      }
      setError(null);
      try {
        const res = await api<T>(path);
        cache.set(path, res);
        if (id === seq.current) setDataState(res);
      } catch (e) {
        if (id === seq.current) setError(errorMessage(e));
      } finally {
        if (id === seq.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [path],
  );

  useEffect(() => {
    // Ma'lumot olish: tashqi tizim (tarmoq) bilan sinxronlash — holat so'rov boshida sinxron tiklanadi
    // oxlint-disable-next-line react/set-state-in-effect
    void run(false);
  }, [run]);

  const reload = useCallback(() => run(false), [run]);
  const refresh = useCallback(async () => {
    setRefreshing(true);
    await run(true);
  }, [run]);
  const setData = useCallback((updater: (prev: T | null) => T | null) => setDataState(updater), []);

  return { data, loading, refreshing, error, reload, refresh, setData };
}

interface PagedState<T> {
  items: T[];
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  reload: () => Promise<void>;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  setItems: (updater: (prev: T[]) => T[]) => void;
}

/** `?cursor=` bilan sahifalanadigan ro'yxat (docs/FOR_CLIENTS.md «Pagination»). `path` o'zgarsa qayta yuklanadi. */
export function usePaged<T>(path: string): PagedState<T> {
  const hit0 = cache.get(`paged:${path}`) as Page<T> | undefined;
  const [items, setItemsState] = useState<T[]>(hit0?.items ?? []);
  const [cursor, setCursor] = useState<string | null>(hit0?.nextCursor ?? null);
  const [loading, setLoading] = useState(hit0 === undefined);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);
  const busyMore = useRef(false);

  const url = useCallback(
    (c: string | null) => `${path}${path.includes('?') ? '&' : '?'}limit=20${c ? `&cursor=${encodeURIComponent(c)}` : ''}`,
    [path],
  );

  const first = useCallback(
    async (silent: boolean) => {
      const id = ++seq.current;
      if (!silent) {
        const hit = cache.get(`paged:${path}`) as Page<T> | undefined;
        setLoading(hit === undefined);
        setItemsState(hit?.items ?? []);
        setCursor(hit?.nextCursor ?? null);
      }
      setError(null);
      try {
        const res = await api<Page<T>>(url(null));
        cache.set(`paged:${path}`, res);
        if (id !== seq.current) return;
        setItemsState(res.items);
        setCursor(res.nextCursor);
      } catch (e) {
        if (id === seq.current) setError(errorMessage(e));
      } finally {
        if (id === seq.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [url, path],
  );

  useEffect(() => {
    // Ma'lumot olish: tashqi tizim (tarmoq) bilan sinxronlash — holat so'rov boshida sinxron tiklanadi
    // oxlint-disable-next-line react/set-state-in-effect
    void first(false);
  }, [first]);

  const loadMore = useCallback(async () => {
    if (!cursor || busyMore.current) return;
    busyMore.current = true;
    setLoadingMore(true);
    const id = seq.current;
    try {
      const res = await api<Page<T>>(url(cursor));
      if (id !== seq.current) return;
      setItemsState((prev) => [...prev, ...res.items]);
      setCursor(res.nextCursor);
    } catch (e) {
      if (id === seq.current) setError(errorMessage(e));
    } finally {
      busyMore.current = false;
      setLoadingMore(false);
    }
  }, [cursor, url]);

  const reload = useCallback(() => first(false), [first]);
  const refresh = useCallback(async () => {
    setRefreshing(true);
    await first(true);
  }, [first]);
  const setItems = useCallback((updater: (prev: T[]) => T[]) => setItemsState(updater), []);

  return { items, loading, refreshing, loadingMore, error, hasMore: cursor !== null, reload, refresh, loadMore, setItems };
}
