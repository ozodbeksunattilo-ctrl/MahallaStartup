import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { AuthShell } from '@/components/AuthShell';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { Select } from '@/components/Select';
import { Text } from '@/components/Text';
import { ApiError, api } from '@/lib/api';
import { haptic } from '@/lib/haptics';
import { errorMessage } from '@/lib/hooks';
import { useTheme, type ToneName } from '@/theme';

/** Yuborilgan so'rov id'si: ilova qayta ochilganda holatini ko'rsatish uchun */
const REQUEST_KEY = 'mhd_access_request';

type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
interface StatusInfo {
  id: string;
  status: RequestStatus;
  note: string | null;
  mahallaName: string;
}

const STATUS_VIEW: Record<RequestStatus, { icon: keyof typeof Ionicons.glyphMap; tone: ToneName; title: string; text: string }> = {
  PENDING: {
    icon: 'hourglass',
    tone: 'orange',
    title: "Ko'rib chiqilmoqda",
    text: "Mahalla admini ko'rib chiqadi va sizga login hamda parol beradi",
  },
  APPROVED: {
    icon: 'checkmark-circle',
    tone: 'green',
    title: 'Tasdiqlandi',
    text: 'Akkauntingiz tayyor. Admin bergan login va vaqtinchalik parol bilan kiring.',
  },
  REJECTED: {
    icon: 'close-circle',
    tone: 'rose',
    title: 'Rad etildi',
    text: "So'rovingiz rad etildi. Ma'lumotlarni tekshirib qayta yuboring.",
  },
};

// API: GET /auth/mahallas · POST /auth/access-requests · GET /auth/access-requests/:id
export default function RegisterScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [mahallas, setMahallas] = useState<Array<{ id: string; name: string }> | null>(null);
  const [mahallasError, setMahallasError] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('+998 ');
  const [mahallaId, setMahallaId] = useState<string | null>(null);
  const [address, setAddress] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [request, setRequest] = useState<StatusInfo | null>(null);
  const [checking, setChecking] = useState(false);

  const loadMahallas = useCallback(async () => {
    setMahallasError(null);
    try {
      const res = await api<{ items: Array<{ id: string; name: string }> }>('/auth/mahallas');
      setMahallas(res.items);
    } catch (e) {
      setMahallasError(e instanceof ApiError && e.status === 0 ? errorMessage(e) : "Mahallalar ro'yxatini yuklab bo'lmadi");
    }
  }, []);

  const checkStatus = useCallback(async (id: string) => {
    setChecking(true);
    try {
      const info = await api<StatusInfo>(`/auth/access-requests/${id}`);
      setRequest(info);
      if (info.status === 'APPROVED') haptic.success();
    } catch (e) {
      // So'rov o'chirilgan bo'lsa — formani qayta ko'rsatamiz
      if (e instanceof ApiError && e.status === 404) {
        await SecureStore.deleteItemAsync(REQUEST_KEY).catch(() => undefined);
        setRequest(null);
      } else {
        setError(errorMessage(e));
      }
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect
    void loadMahallas();
    void SecureStore.getItemAsync(REQUEST_KEY)
      .then((id) => (id ? checkStatus(id) : undefined))
      .catch(() => undefined);
  }, [loadMahallas, checkStatus]);

  const digits = phone.replace(/\D/g, '');
  const valid = fullName.trim().length >= 3 && digits.length >= 9 && mahallaId !== null;

  async function submit() {
    setPending(true);
    setError(null);
    setFields({});
    try {
      const res = await api<{ id: string; status: RequestStatus }>('/auth/access-requests', {
        method: 'POST',
        json: {
          fullName: fullName.trim(),
          phone: phone.trim(),
          mahallaId,
          address: address.trim() || undefined,
        },
      });
      await SecureStore.setItemAsync(REQUEST_KEY, res.id).catch(() => undefined);
      haptic.success();
      setRequest({
        id: res.id,
        status: res.status,
        note: null,
        mahallaName: mahallas?.find((m) => m.id === mahallaId)?.name ?? '',
      });
    } catch (e) {
      haptic.error();
      const f = e instanceof ApiError ? (e.details as { fields?: Record<string, string> }).fields : undefined;
      if (f) setFields(f);
      setError(errorMessage(e));
    } finally {
      setPending(false);
    }
  }

  async function startOver() {
    await SecureStore.deleteItemAsync(REQUEST_KEY).catch(() => undefined);
    setRequest(null);
  }

  if (request) {
    return (
      <AuthShell title="So'rov holati" subtitle={request.mahallaName}>
        <RequestStatusView info={request} />
        {request.status === 'APPROVED' ? (
          <Button title="Kirish" icon="log-in-outline" onPress={() => router.replace('/login')} />
        ) : request.status === 'PENDING' ? (
          <Button
            title="Holatni tekshirish"
            icon="refresh"
            variant="secondary"
            loading={checking}
            onPress={() => void checkStatus(request.id)}
          />
        ) : (
          <Button title="Yangi so'rov yuborish" icon="create-outline" onPress={() => void startOver()} />
        )}
        <Button title="Kirish ekraniga" variant="ghost" onPress={() => router.back()} />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Ro'yxatdan o'tish"
      subtitle="Ma'lumotlaringizni yuboring — mahalla admini akkaunt yaratib beradi"
      footer={<Button title="Akkauntim bor — kirish" variant="ghost" onPress={() => router.back()} />}
    >
      <Field
        label="Ism va familiya"
        icon="person-outline"
        iconTone="blue"
        value={fullName}
        onChangeText={setFullName}
        autoComplete="name"
        textContentType="name"
        maxLength={100}
        returnKeyType="next"
        error={fields.fullName}
      />
      <Field
        label="Telefon raqami"
        icon="call-outline"
        iconTone="green"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        maxLength={20}
        error={fields.phone}
      />
      <Select
        label="Mahalla"
        icon="home-outline"
        iconTone="purple"
        placeholder="Mahallangizni tanlang"
        options={(mahallas ?? []).map((m) => ({ value: m.id, label: m.name, raw: true }))}
        value={mahallaId}
        onChange={setMahallaId}
        searchable
        error={fields.mahallaId ?? fields.mahallaName ?? mahallasError}
      />
      {mahallasError ? <Button title="Qayta urinish" variant="ghost" onPress={() => void loadMahallas()} /> : null}
      <Field
        label="Manzil (ixtiyoriy)"
        icon="location-outline"
        iconTone="orange"
        placeholder="Ko'cha, uy raqami"
        value={address}
        onChangeText={setAddress}
        maxLength={200}
        error={fields.address}
      />
      <Text variant="muted">
        Akkauntni faqat mahalla admini beradi. Telefon raqami admin siz bilan bog&apos;lanishi uchun kerak.
      </Text>
      {error && Object.keys(fields).length === 0 ? (
        <Text accessibilityRole="alert" style={{ color: colors.danger }}>
          {error}
        </Text>
      ) : null}
      <Button title="So'rov yuborish" icon="paper-plane-outline" onPress={() => void submit()} loading={pending} disabled={!valid} />
    </AuthShell>
  );
}

function RequestStatusView({ info }: { info: StatusInfo }) {
  const { tones, spacing, radius } = useTheme();
  const v = STATUS_VIEW[info.status];
  const tone = tones[v.tone];
  return (
    <Animated.View
      key={info.status}
      entering={FadeIn.duration(300)}
      style={{ alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: tone.soft }}
    >
      <Animated.View entering={ZoomIn.springify().damping(12).delay(100)}>
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: tone.fg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={v.icon} size={40} color="#fff" />
        </View>
      </Animated.View>
      <Text variant="heading" style={{ color: tone.fg }}>
        {v.title}
      </Text>
      <Text style={{ textAlign: 'center' }}>{v.text}</Text>
      {info.note ? (
        <Text variant="muted" style={{ textAlign: 'center' }} raw>
          {info.note}
        </Text>
      ) : null}
    </Animated.View>
  );
}
