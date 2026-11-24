import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { View } from 'react-native';
import { AuthShell } from '@/components/AuthShell';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { Text } from '@/components/Text';
import { ApiError, api } from '@/lib/api';
import { useSession } from '@/lib/session';
import { useTheme } from '@/theme';

// API: POST /auth/login { login, password, client: "mobile" } -> { token, user, mustChangePassword }
export default function LoginScreen() {
  const { colors, spacing, radius } = useTheme();
  const { signIn } = useSession();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);
    setError(null);
    try {
      const res = await api<{ token: string; mustChangePassword: boolean; user: { role: string } }>('/auth/login', {
        method: 'POST',
        json: { login: login.trim().toLowerCase(), password, client: 'mobile' },
      });
      // Hozircha admin ham ilovaga kira oladi (vaqtinchalik)
      await signIn(res.token, res.mustChangePassword);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Kutilmagan xato yuz berdi');
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthShell
      title="Xush kelibsiz"
      subtitle="Mahalla admini bergan login va parol bilan kiring"
      footer={
        <>
          <View
            style={{
              flexDirection: 'row',
              gap: spacing.sm,
              alignItems: 'center',
              backgroundColor: colors.primarySoft,
              borderRadius: radius.md,
              padding: spacing.md,
            }}
          >
            <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
            <Text variant="muted" style={{ flex: 1, color: colors.text }}>
              Ma&apos;lumotlaringiz himoyalangan. Faqat o&apos;z mahallangiz aholisi va admini ko&apos;radi.
            </Text>
          </View>
        </>
      }
    >
      <Field
        label="Login"
        icon="person-outline"
        iconTone="blue"
        placeholder="masalan, sardor.k"
        value={login}
        onChangeText={setLogin}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username"
        maxLength={50}
        returnKeyType="next"
      />
      <Field
        label="Parol"
        icon="lock-closed-outline"
        iconTone="orange"
        placeholder="Parolingiz"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
        maxLength={50}
        returnKeyType="go"
        onSubmitEditing={() => login && password && void submit()}
        error={error}
      />
      <Button title="Kirish" icon="log-in-outline" onPress={submit} loading={pending} disabled={!login || !password} />
    </AuthShell>
  );
}
