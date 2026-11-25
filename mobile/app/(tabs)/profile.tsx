import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { ConfirmModal } from '@/components/ConfirmModal';
import { Card } from '@/components/Card';
import { LangSwitch } from '@/components/LangSwitch';
import { Hero } from '@/components/Hero';
import { ListRow } from '@/components/ListRow';
import { Screen } from '@/components/Screen';
import { AsyncView } from '@/components/StateView';
import { Text } from '@/components/Text';
import { useFetch } from '@/lib/hooks';
import { useSession } from '@/lib/session';
import type { Me } from '@/lib/types';
import { useTheme } from '@/theme';

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

// API: GET /me -> user, mahalla, rol, unreadNotifications
export default function ProfileScreen() {
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const { signOut } = useSession();
  const me = useFetch<Me>('/me');
  const [confirmOut, setConfirmOut] = useState(false);

  return (
    <Screen
      onRefresh={() => void me.refresh()}
      refreshing={me.refreshing}
      header={
        <Hero>
          <View style={{ alignItems: 'center', gap: spacing.sm, paddingTop: spacing.sm }}>
            <View
              style={{
                width: 92,
                height: 92,
                borderRadius: 46,
                backgroundColor: colors.heroText,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text variant="display" style={{ color: colors.hero }}>
                {me.data ? initials(me.data.user.displayName) : ''}
              </Text>
            </View>
            <Text variant="title" style={{ color: colors.heroText }}>
              {me.data?.user.displayName ?? ' '}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="location-outline" size={14} color={colors.heroMuted} />
              <Text variant="muted" style={{ color: colors.heroMuted }}>
                {me.data?.mahalla.name ?? ' '}
              </Text>
            </View>
          </View>
        </Hero>
      }
    >
      <AsyncView data={me.data} loading={me.loading} error={me.error} onRetry={me.reload}>
        {(m) => (
          <>
            <Card title="Akkaunt" icon="person-outline">
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text variant="muted">Login</Text>
                <Text variant="label">{m.user.login}</Text>
              </View>
              {m.user.phone ? (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text variant="muted">Telefon</Text>
                  <Text variant="label">{m.user.phone}</Text>
                </View>
              ) : null}
            </Card>

            <Card>
              <ListRow icon="document-text-outline" title="Mening muammolarim" tone="blue" onPress={() => router.push('/issues/mine')} />
              <ListRow
                icon="notifications-outline"
                tone="orange"
                title="Bildirishnomalar"
                badge={m.unreadNotifications}
                onPress={() => router.push('/notifications')}
              />
              <ListRow icon="megaphone-outline" title="E'lonlar" tone="rose" onPress={() => router.push('/announcements')} />
              <ListRow icon="trophy-outline" title="Oldingi ovoz davrlari" tone="green" onPress={() => router.push('/rounds')} />
            </Card>

            <Card title="Til" icon="language-outline">
              <LangSwitch />
            </Card>

            <Card>
              <ListRow icon="key-outline" title="Parolni almashtirish" tone="purple" onPress={() => router.push('/change-password')} />
              <ListRow icon="log-out-outline" title="Chiqish" destructive onPress={() => setConfirmOut(true)} />
            </Card>

            <Text variant="muted" style={{ textAlign: 'center', color: colors.muted }}>
              Mahalladosh · v0.1.0
            </Text>
          </>
        )}
      </AsyncView>
      <ConfirmModal
        visible={confirmOut}
        title="Chiqish"
        message="Akkauntdan chiqmoqchimisiz?"
        confirmTitle="Ha, chiqish"
        destructive
        onCancel={() => setConfirmOut(false)}
        onConfirm={() => {
          setConfirmOut(false);
          void signOut();
        }}
      />
    </Screen>
  );
}
