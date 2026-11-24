import { Alert } from 'react-native';
import { api } from './api';
import { errorMessage } from './hooks';

export type ReportTarget = 'POST' | 'COMMENT' | 'CHAT_MESSAGE';

const REASONS = ['Spam yoki reklama', "Haqorat yoki tahdid", "Noto'g'ri ma'lumot", 'Boshqa sabab'];

/** Shikoyat yuborish: sabab tanlanadi (POST /reports; bir kontentga bitta shikoyat — takroriy so'rov 200). */
export function reportContent(targetType: ReportTarget, targetId: string): void {
  Alert.alert('Shikoyat qilish', 'Sababni tanlang. Admin ko‘rib chiqadi.', [
    ...REASONS.map((reason) => ({
      text: reason,
      onPress: () => {
        api('/reports', { method: 'POST', json: { targetType, targetId, reason } })
          .then(() => Alert.alert('Rahmat', 'Shikoyatingiz adminga yuborildi.'))
          .catch((e: unknown) => Alert.alert('Yuborib bo‘lmadi', errorMessage(e)));
      },
    })),
    { text: 'Bekor qilish', style: 'cancel' as const },
  ]);
}
