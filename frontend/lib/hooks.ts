'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, api } from './api';

export function errorText(e: unknown): string {
  if (e instanceof ApiError) {
    const fields = (e.details as { fields?: Record<string, string> }).fields;
    const first = fields ? Object.values(fields)[0] : undefined;
    return first ? `${e.message}: ${first}` : e.message;
  }
  return e instanceof Error ? e.message : "Kutilmagan xato yuz berdi";
}

export interface FetchState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => Promise<void>;
}

/**
 * GET so'rovi: yuklanish/xato holati va qayta yuklash. `path === null` bo'lsa so'rov yuborilmaydi.
 * `pollMs` berilsa, shu oraliqda so'rov takrorlanadi (chat, navbatlar).
 */
export function useFetch<T>(path: string | null, pollMs?: number): FetchState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Qaysi yo'l uchun javob kelgani; `loading` shundan hisoblanadi (effekt ichida setState kerak emas)
  const [loadedPath, setLoadedPath] = useState<string | null>(null);
  // Filtr/sahifa tez almashganda eski so'rovning kech kelgan javobi yangisini bosib ketmasin
  const latest = useRef<string | null>(path);
  useEffect(() => {
    latest.current = path;
  }, [path]);

  const reload = useCallback(async () => {
    if (path === null) return;
    try {
      const res = await api<T>(path);
      if (latest.current !== path) return;
      setData(res);
      setError(null);
    } catch (e) {
      if (latest.current !== path) return;
      setError(errorText(e));
    } finally {
      if (latest.current === path) setLoadedPath(path);
    }
  }, [path]);

  useEffect(() => {
    // Serverdan yuklash — tashqi tizim bilan sinxronlash; setState faqat javob kelgach chaqiriladi
    // oxlint-disable-next-line react/set-state-in-effect
    void reload();
    if (!pollMs) return;
    const timer = setInterval(() => void reload(), pollMs);
    return () => clearInterval(timer);
  }, [reload, pollMs]);

  return { data, error, loading: path !== null && loadedPath !== path, reload };
}

/** Mutatsiya: band holati va xato matni. `run` muvaffaqiyatda natijani, xatoda `undefined` qaytaradi. */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    setBusy(true);
    setError(null);
    try {
      return await fn();
    } catch (e) {
      setError(errorText(e));
      return undefined;
    } finally {
      setBusy(false);
    }
  }, []);
  return { busy, error, run, setError };
}
