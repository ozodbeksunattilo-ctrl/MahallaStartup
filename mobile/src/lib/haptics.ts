import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Tebranish ixtiyoriy bezak: qurilma qo'llamasa jim o'tib ketadi
const safe = (p: Promise<void>) => void p.catch(() => undefined);
const enabled = Platform.OS === 'ios' || Platform.OS === 'android';

export const haptic = {
  /** Oddiy bosish (tugma, chip) */
  tap: () => enabled && safe(Haptics.selectionAsync()),
  /** Muhimroq amal (ovoz berish, yuborish) */
  impact: () => enabled && safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  success: () => enabled && safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => enabled && safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => enabled && safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
