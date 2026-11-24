import * as Notifications from 'expo-notifications';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AnimatedSplash } from '@/components/AnimatedSplash';
import { API_URL, DEMO, SKIP_AUTH } from '@/lib/config';
import { log } from '@/lib/log';
import { useStackScreenOptions } from '@/lib/navigation';
import { openEntity } from '@/lib/push';
import { LangProvider, useLang } from '@/lib/i18n';
import { SessionProvider, useSession } from '@/lib/session';

log.info('app', 'API:', API_URL, SKIP_AUTH ? '(SKIP_AUTH)' : '', DEMO ? '(DEMO)' : '');
SplashScreen.preventAutoHideAsync().catch(() => undefined);

function RootStack() {
  const { status, mustChangePassword } = useSession();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    log.info('session', 'holat:', status, mustChangePassword ? '(parol almashtirish kerak)' : '');
  }, [status, mustChangePassword]);

  // Native splash (logotip) darhol animatsiyali splash'ga almashadi: oq ekran ko'rinmaydi
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => undefined);
  }, []);

  return (
    <>
      <Navigation />
      {showSplash ? <AnimatedSplash ready={status !== 'loading'} onDone={() => setShowSplash(false)} /> : null}
    </>
  );
}

function Navigation() {
  const router = useRouter();
  const { status, mustChangePassword } = useSession();
  const screenOptions = useStackScreenOptions();
  const { t } = useLang();
  const signedIn = status === 'signedIn';
  const ready = signedIn && !mustChangePassword;

  // Bildirishnomani bosish -> tegishli ekran (ilova yopiq bo'lganda ham)
  useEffect(() => {
    if (!ready) return;
    const open = (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      const data = response.notification.request.content.data as
        | { entityType?: string; entityId?: string }
        | undefined;
      openEntity(router, data?.entityType, data?.entityId);
    };
    open(Notifications.getLastNotificationResponse());
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, [ready, router]);

  return (
    <Stack screenOptions={screenOptions}>
      {/* Parol almashtirish: vaqtinchalik parol bilan kirganda majburiy, keyin profil orqali ixtiyoriy */}
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="change-password" options={{ title: t('Parolni almashtirish') }} />
      </Stack.Protected>

      <Stack.Protected guard={ready}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="issues" options={{ headerShown: false }} />
        <Stack.Screen name="rounds" options={{ headerShown: false }} />
        <Stack.Screen name="events/[id]" options={{ title: t('Tadbir') }} />
        <Stack.Screen name="announcements" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ title: t('Bildirishnomalar') }} />
      </Stack.Protected>

      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <LangProvider>
        <SessionProvider>
          <StatusBar style="auto" />
          <RootStack />
        </SessionProvider>
      </LangProvider>
    </GestureHandlerRootView>
  );
}
