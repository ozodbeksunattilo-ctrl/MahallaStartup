import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { Logo } from '@/components/Logo';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/hooks';
import { useSession } from '@/lib/session';
import { useTheme } from '@/theme';

/** 0–4: uzunlik, harf, raqam, katta harf/belgi bo'yicha oddiy baho */
function strength(p: string): number {
  let s = 0;
  if (p.length >= 8) s++;
  if (/[a-z]/i.test(p) && /\d/.test(p)) s++;
  if (/[A-Z]/.test(p) || /[^A-Za-z0-9]/.test(p)) s++;
  if (p.length >= 12) s++;
  return s;
}

const LABELS = ['Juda zaif', 'Zaif', "O'rtacha", 'Yaxshi', 'Kuchli'];

// API: POST /auth/change-password { currentPassword, newPassword }
export default function ChangePasswordScreen() {
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();
  const { mustChangePassword, passwordChanged } = useSession();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const score = next ? strength(next) : 0;
  const barColor = score <= 1 ? colors.danger : score === 2 ? colors.warning : colors.success;

  async function submit() {
    if (next.length < 8) return setError("Yangi parol kamida 8 belgidan iborat bo'lsin");
    if (next !== confirm) return setError('Parollar mos kelmadi');
    if (next === current) return setError('Yangi parol eskisidan farq qilsin');

    setPending(true);
    setError(null);
    try {
      await api('/auth/change-password', {
        method: 'POST',
        json: { currentPassword: current, newPassword: next },
      });
      passwordChanged();
      if (router.canGoBack()) router.back();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setPending(false);
    }
  }

  return (
    <Screen>
      <View style={{ alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md }}>
        <Logo size={56} />
        <Text variant="muted" style={{ textAlign: 'center' }}>
          {mustChangePassword
            ? "Vaqtinchalik parol bilan kirdingiz. Davom etish uchun yangi parol o'rnating."
            : 'Hisobingiz xavfsizligi uchun kuchli parol tanlang.'}
        </Text>
      </View>

      <Field label="Joriy parol" icon="lock-closed-outline" iconTone="orange" value={current} onChangeText={setCurrent} secureTextEntry />
      <Field
        label="Yangi parol"
        icon="key-outline"
        iconTone="purple"
        hint="Kamida 8 belgi: harf va raqam aralash bo'lsin"
        value={next}
        onChangeText={setNext}
        secureTextEntry
      />
      {next ? (
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {[1, 2, 3, 4].map((n) => (
              <View
                key={n}
                style={{
                  flex: 1,
                  height: 6,
                  borderRadius: radius.pill,
                  backgroundColor: n <= score ? barColor : colors.surfaceAlt,
                }}
              />
            ))}
          </View>
          <Text variant="muted" style={{ color: barColor }}>
            {LABELS[score]}
          </Text>
        </View>
      ) : null}
      <Field
        label="Yangi parolni takrorlang"
        icon="checkmark-done-outline"
        iconTone="green"
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        error={error}
      />
      <Button
        title="Parolni saqlash"
        icon="save-outline"
        onPress={submit}
        loading={pending}
        disabled={!current || !next || !confirm}
      />
    </Screen>
  );
}
