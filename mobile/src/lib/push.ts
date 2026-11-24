import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import type { useRouter } from 'expo-router';
import { Platform } from 'react-native';
import { api } from './api';

// Ilova ochiq paytda ham banner ko'rsatiladi
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

let registeredToken: string | null = null;

/**
 * Push ruxsatini so'raydi va qurilma tokenini serverga yozadi (`PUT /devices`, idempotent).
 * Ruxsat berilmasa yoki simulyator/Expo Go bo'lsa — jim o'tadi: ilova ichidagi bildirishnomalar baribir ishlaydi (TZ 5-bo'lim).
 */
export async function registerForPush(): Promise<void> {
  try {
    if (!Device.isDevice) return;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Mahalladosh',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') return;

    const projectId =
      (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ??
      Constants.easConfig?.projectId;
    const token = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data;
    await api('/devices', {
      method: 'PUT',
      json: { expoPushToken: token, platform: Platform.OS === 'ios' ? 'ios' : 'android' },
    });
    registeredToken = token;
  } catch {
    // Push ixtiyoriy; xato ilovani to'xtatmasin
  }
}

/** Chiqishda token serverdan o'chiriladi, aks holda boshqa foydalanuvchiga push borishi mumkin. */
export async function unregisterPush(): Promise<void> {
  if (!registeredToken) return;
  const token = registeredToken;
  registeredToken = null;
  await api(`/devices/${encodeURIComponent(token)}`, { method: 'DELETE' }).catch(() => undefined);
}

/** `entityType` -> ekran (docs/FOR_CLIENTS.md «Push» jadvali). */
export function openEntity(router: ReturnType<typeof useRouter>, entityType: string | null | undefined, entityId: string | null | undefined) {
  if (!entityType || !entityId) {
    router.push('/notifications');
    return;
  }
  switch (entityType) {
    case 'ISSUE':
      router.push(`/issues/${entityId}`);
      break;
    case 'EVENT':
      router.push(`/events/${entityId}`);
      break;
    case 'ANNOUNCEMENT':
      router.push(`/announcements/${entityId}`);
      break;
    case 'ROUND':
      router.push(`/rounds/${entityId}`);
      break;
    default:
      router.push('/notifications');
  }
}
