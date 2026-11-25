import { useState } from 'react';
import { View } from 'react-native';
import { AuthShell } from '@/components/AuthShell';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { Text } from '@/components/Text';
import { ApiError, api } from '@/lib/api';
import { haptic } from '@/lib/haptics';
import { useSession } from '@/lib/session';
import { useTheme } from '@/theme';

// API: POST /auth/login { login, password, client: "mobile" } -> { token, user, mustChangePassword }
export default function LoginScreen() {
  const { signIn } = useSession();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(creds?: { login: string; password: string }) {
    const l = creds?.login ?? login;
    const p = creds?.password ?? password;
    setPending(true);
    setError(null);
    try {
      const res = await api<{ token: string; mustChangePassword: boolean; user: { role: string } }>('/auth/login', {
        method: 'POST',
        json: { login: l.trim().toLowerCase(), password: p, client: 'mobile' },
      });
      // Mobil ilova — aholi uchun. Admin ovoz bera olmaydi, muammo yubora olmaydi, tadbirga yozila olmaydi
      // (backend 403), shuning uchun kiritilmaydi: admin veb-paneldan ishlaydi.
      if (res.user.role === 'MAHALLA_ADMIN') {
        await api('/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${res.token}` } }).catch(() => undefined);
        haptic.warning();
        setError('Bu admin akkaunti. Admin veb-panel orqali kiradi; ilovada aholi akkaunti bilan kiring.');
        return;
      }
      haptic.success();
      await signIn(res.token, res.mustChangePassword);
    } catch (e) {
      haptic.error();
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
        <Text variant="muted">
          Ma&apos;lumotlaringiz himoyalangan. Faqat o&apos;z mahallangiz aholisi va admini ko&apos;radi.
        </Text>
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
      <Button title="Kirish" onPress={() => void submit()} loading={pending} disabled={!login || !password} />
      {__DEV__ ? <DemoAccounts onPick={(l, p) => void submit({ login: l, password: p })} /> : null}
    </AuthShell>
  );
}

/** Faqat dev rejimida: `pnpm db:seed:demo` aholi akkauntlari bilan bir bosishda kirish. */
const DEMO_ACCOUNTS = ['ali.yunusobod', 'vali.yunusobod', 'sara.yunusobod', 'ali.chilonzor'];

function DemoAccounts({ onPick }: { onPick: (login: string, password: string) => void }) {
  const { colors, spacing, radius } = useTheme();
  return (
    <View style={{ gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border }}>
      <Text variant="eyebrow">Demo aholi (dev)</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {DEMO_ACCOUNTS.map((l) => (
          <Text
            key={l}
            raw
            accessibilityRole="button"
            onPress={() => onPick(l, 'Demo12345!')}
            style={{
              paddingHorizontal: spacing.md,
              paddingVertical: 8,
              borderRadius: radius.pill,
              backgroundColor: colors.primarySoft,
              color: colors.primary,
              fontWeight: '700',
              overflow: 'hidden',
            }}
          >
            {l}
          </Text>
        ))}
      </View>
    </View>
  );
}
