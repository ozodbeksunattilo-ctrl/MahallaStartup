import { Lora_500Medium, Lora_500Medium_Italic } from '@expo-google-fonts/lora';
import { Onest_400Regular, Onest_500Medium, Onest_600SemiBold, Onest_700Bold } from '@expo-google-fonts/onest';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { AnimatedSplash } from '@/components/AnimatedSplash';
import { UpdatePrompt } from '@/components/UpdatePrompt';
import { API_URL } from '@/lib/config';
import { log } from '@/lib/log';
import { useStackScreenOptions } from '@/lib/navigation';
import { openEntity } from '@/lib/push';
import { LangProvider, useLang } from '@/lib/i18n';
import { SessionProvider, useSession } from '@/lib/session';

log.info('app', 'API:', API_URL);
SplashScreen.preventAutoHideAsync().catch(() => undefined);

function RootStack() {
  const { status, mustChangePassword } = useSession();
  const [showSplash, setShowSplash] = useState(true);
  // Dizayn shriftlari: Lora (sarlavhalar) va Onest (matn). Xato bo'lsa tizim shrifti bilan davom etadi.
  const [fontsLoaded, fontError] = useFonts({
    Lora_500Medium,
    Lora_500Medium_Italic,
    Onest_400Regular,
    Onest_500Medium,
    Onest_600SemiBold,
    Onest_700Bold,
  });
  const ready = status !== 'loading' && (fontsLoaded || fontError !== null);

  useEffect(() => {
    log.info('session', 'holat:', status, mustChangePassword ? '(parol almashtirish kerak)' : '');
  }, [status, mustChangePassword]);

  // Native splash (logotip) darhol animatsiyali splash'ga almashadi: oq ekran ko'rinmaydi
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => undefined);
  }, []);

  return (
    <>
      {/* Sessiya aniqlanmaguncha navigator chizilmaydi (splash yopib turadi): aks holda login -> tablar
          almashuvida ROUTE_NAMES_CHANGED xatosi chiqadi */}
      {ready ? <Navigation /> : null}
      {/* Yangi APK chiqqan bo'lsa «Yangilash» oynasi (splash yopilgandan keyin) */}
      {ready && !showSplash ? <UpdatePrompt /> : null}
      {showSplash ? <AnimatedSplash ready={ready} onDone={() => setShowSplash(false)} /> : null}
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
      <KeyboardProvider>
        <LangProvider>
          <SessionProvider>
            <StatusBar style="dark" />
            <RootStack />
          </SessionProvider>
        </LangProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
