import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, setSessionHandlers } from './api';
import { DEMO, SKIP_AUTH } from './config';
import { clearFetchCache } from './hooks';
import { registerForPush, unregisterPush } from './push';
import { clearToken, loadToken, saveToken } from './token';

type Status = 'loading' | 'signedOut' | 'signedIn';

interface SessionValue {
  status: Status;
  /** Birinchi kirishda (vaqtinchalik parol) true: faqat parol almashtirish ekrani ochiq */
  mustChangePassword: boolean;
  /** Mobil: `POST /auth/login` javobidagi `token` saqlanadi */
  signIn: (token: string, mustChangePassword: boolean) => Promise<void>;
  signOut: () => Promise<void>;
  passwordChanged: () => void;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>(SKIP_AUTH ? 'signedIn' : 'loading');
  const [mustChangePassword, setMustChangePassword] = useState(false);

  useEffect(() => {
    if (SKIP_AUTH) return;
    // SecureStore osilib qolsa ham 3s dan keyin login ekraniga o'tamiz
    const timer = setTimeout(() => setStatus((s) => (s === 'loading' ? 'signedOut' : s)), 3000);
    void loadToken().then((token) => setStatus(token ? 'signedIn' : 'signedOut'));
    return () => clearTimeout(timer);
  }, []);

  const signIn = useCallback(async (token: string, mustChange: boolean) => {
    await saveToken(token);
    setMustChangePassword(mustChange);
    setStatus('signedIn');
  }, []);

  const signOut = useCallback(async () => {
    await unregisterPush();
    // Serverda sessiyani bekor qilishga urinamiz; xato bo'lsa ham lokal tozalaymiz
    await api('/auth/logout', { method: 'POST' }).catch(() => undefined);
    await clearToken();
    clearFetchCache();
    setMustChangePassword(false);
    setStatus('signedOut');
  }, []);

  // Parol almashtirilgach (boshqa bo'limlar ochilgach) push tokenini yozamiz
  useEffect(() => {
    if (status === 'signedIn' && !mustChangePassword && !SKIP_AUTH && !DEMO) void registerForPush();
  }, [status, mustChangePassword]);

  const passwordChanged = useCallback(() => setMustChangePassword(false), []);

  useEffect(() => {
    setSessionHandlers({
      onUnauthorized: () => {
        void clearToken();
        clearFetchCache();
        setMustChangePassword(false);
        setStatus('signedOut');
      },
      onPasswordChangeRequired: () => setMustChangePassword(true),
    });
    return () => setSessionHandlers({});
  }, []);

  const value = useMemo(
    () => ({ status, mustChangePassword, signIn, signOut, passwordChanged }),
    [status, mustChangePassword, signIn, signOut, passwordChanged],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession SessionProvider ichida ishlatilishi kerak');
  return ctx;
}
