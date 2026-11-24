import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, View } from 'react-native';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Hero } from '@/components/Hero';
import { Screen } from '@/components/Screen';
import { AsyncView } from '@/components/StateView';
import { StatusBadge } from '@/components/StatusBadge';
import { Text } from '@/components/Text';
import { formatTime, monthName, timeAgo, timeLeft } from '@/lib/format';
import { useFetch } from '@/lib/hooks';
import type { Home, Me } from '@/lib/types';
import { useTheme, type ToneName } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;

const ACTIONS: Array<{ icon: IconName; label: string; href: string; tone: ToneName }> = [
  { icon: 'add-circle', label: 'Muammo\nyuborish', href: '/issues/new', tone: 'blue' },
  { icon: 'document-text', label: 'Mening\nmuammolarim', href: '/issues/mine', tone: 'teal' },
  { icon: 'megaphone', label: "E'lonlar", href: '/announcements', tone: 'rose' },
  { icon: 'trophy', label: 'Oldingi\ndavrlar', href: '/rounds', tone: 'orange' },
];

// API: GET /home (bitta so'rov) + GET /me (mahalla nomi)
export default function HomeScreen() {
  const router = useRouter();
  const { colors, tones, spacing, radius, shadow } = useTheme();
  const home = useFetch<Home>('/home');
  const me = useFetch<Me>('/me');

  // Boshqa ekrandan qaytganda (ovoz berilgan, o'qilgan) yangilanadi
  const { refresh: refreshHome } = home;
  useFocusEffect(
    useCallback(() => {
      void refreshHome();
    }, [refreshHome]),
  );

  const unread = home.data?.unreadNotifications ?? 0;
  const firstName = me.data?.user.displayName.split(' ')[0];

  return (
    <Screen
      onRefresh={() => {
        void home.refresh();
        void me.refresh();
      }}
      refreshing={home.refreshing}
      header={
        <Hero extraBottom={56}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
            <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
              <Logo size={42} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="muted" style={{ color: 'rgba(255,255,255,0.75)' }}>
                {firstName ? `Salom, ${firstName}` : 'Xush kelibsiz'}
              </Text>
              <Text variant="display" style={{ color: '#fff' }} numberOfLines={2}>
                {me.data?.mahalla.name ?? 'Mahalladosh'}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Bildirishnomalar"
              onPress={() => router.push('/notifications')}
              style={{
                width: 46,
                height: 46,
                borderRadius: 23,
                backgroundColor: 'rgba(255,255,255,0.16)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="notifications" size={22} color="#fff" />
              {unread > 0 ? (
                <View
                  style={{
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    minWidth: 18,
                    height: 18,
                    borderRadius: 9,
                    backgroundColor: colors.accent,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 4,
                  }}
                >
                  <Text variant="label" style={{ color: '#1c1203', fontSize: 11, lineHeight: 14 }}>
                    {unread}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          </View>
        </Hero>
      }
    >
      <AsyncView data={home.data} loading={home.loading} error={home.error} onRetry={home.reload}>
        {(h) => (
          <>
            {/* Hero ustiga chiqib turadigan ovoz kartochkasi */}
            <View
              style={[
                {
                  marginTop: -56 - spacing.lg,
                  backgroundColor: colors.surface,
                  borderRadius: radius.lg,
                  padding: spacing.lg,
                  gap: spacing.md,
                },
                shadow.md,
              ]}
            >
              {h.round ? (
                <>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
                    <View
                      style={{
                        width: 74,
                        height: 74,
                        borderRadius: 37,
                        borderWidth: 6,
                        borderColor: colors.primarySoft,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text variant="display" style={{ color: colors.primary, fontSize: 32 }}>
                        {h.round.votesLeft}
                      </Text>
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text variant="eyebrow">Ovoz berish davri</Text>
                      <Text variant="heading">{h.round.votesLeft} ta ovoz qoldi</Text>
                      <Text variant="muted">
                        <Ionicons name="time-outline" size={13} color={colors.muted} /> {timeLeft(h.round.periodEnd)}{' '}
                        qoldi · oyiga 3 ta
                      </Text>
                    </View>
                  </View>
                  <Button title="Ovoz berish" icon="thumbs-up" onPress={() => router.push('/feed')} />
                </>
              ) : (
                <>
                  <Text variant="heading">Hozir faol davr yo&apos;q</Text>
                  <Text variant="muted">Yangi ovoz berish davri boshlanganda xabar beramiz.</Text>
                </>
              )}
            </View>

            {/* Tezkor amallar */}
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {ACTIONS.map((a) => (
                <Pressable
                  key={a.href}
                  accessibilityRole="button"
                  onPress={() => router.push(a.href as never)}
                  style={({ pressed }) => [
                    {
                      flex: 1,
                      alignItems: 'center',
                      gap: 8,
                      paddingVertical: spacing.md,
                      backgroundColor: colors.surface,
                      borderRadius: radius.md,
                      transform: [{ scale: pressed ? 0.96 : 1 }],
                    },
                    shadow.sm,
                  ]}
                >
                  <View
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 14,
                      backgroundColor: tones[a.tone].soft,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name={a.icon} size={22} color={tones[a.tone].fg} />
                  </View>
                  <Text variant="label" style={{ fontSize: 11, textAlign: 'center', lineHeight: 14 }}>
                    {a.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Oy muammosi */}
            <Card title="Oy muammosi" icon="trophy-outline">
              {h.featuredIssue ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push(`/issues/${h.featuredIssue?.id}`)}
                  style={{ gap: spacing.sm }}
                >
                  <Text variant="heading">{h.featuredIssue.title}</Text>
                  <StatusBadge status={h.featuredIssue.status} label={h.featuredIssue.statusLabel} />
                  <Text variant="label" style={{ color: colors.primary }}>
                    Batafsil ko&apos;rish →
                  </Text>
                </Pressable>
              ) : (
                <Text variant="muted">Bu oy g&apos;olib yoki jarayondagi muammo hali yo&apos;q.</Text>
              )}
            </Card>

            {/* Yaqin tadbir */}
            <Card title="Yaqin tadbir" icon="calendar-outline">
              {h.nextEvent ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push(`/events/${h.nextEvent?.id}`)}
                  style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}
                >
                  <View
                    style={{
                      width: 58,
                      height: 62,
                      borderRadius: radius.md,
                      backgroundColor: colors.primary,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text variant="title" style={{ color: colors.primaryText, lineHeight: 28 }}>
                      {new Date(h.nextEvent.startsAt).getDate()}
                    </Text>
                    <Text variant="eyebrow" style={{ color: colors.primaryText, opacity: 0.8 }}>
                      {monthName(h.nextEvent.startsAt).slice(0, 3)}
                    </Text>
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text variant="heading" numberOfLines={2}>
                      {h.nextEvent.title}
                    </Text>
                    <Text variant="muted">
                      <Ionicons name="time-outline" size={13} color={colors.muted} /> {formatTime(h.nextEvent.startsAt)}
                      {'  '}
                      <Ionicons name="location-outline" size={13} color={colors.muted} /> {h.nextEvent.location}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                </Pressable>
              ) : (
                <>
                  <Text variant="muted">Rejalashtirilgan tadbir yo&apos;q.</Text>
                  <Button title="Barcha tadbirlar" variant="secondary" onPress={() => router.push('/events')} />
                </>
              )}
            </Card>

            {/* Muhim e'lon */}
            {h.latestImportantAnnouncement ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push(`/announcements/${h.latestImportantAnnouncement?.id}`)}
                style={{
                  flexDirection: 'row',
                  gap: spacing.md,
                  alignItems: 'center',
                  backgroundColor: colors.accentSoft,
                  borderRadius: radius.lg,
                  padding: spacing.lg,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: colors.accent,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="alert" size={22} color="#1c1203" />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="eyebrow" style={{ color: colors.warning }}>
                    Muhim e&apos;lon
                  </Text>
                  <Text variant="heading" style={{ color: colors.text }} numberOfLines={2}>
                    {h.latestImportantAnnouncement.title}
                  </Text>
                  <Text variant="muted">{timeAgo(h.latestImportantAnnouncement.publishedAt)}</Text>
                </View>
              </Pressable>
            ) : null}
          </>
        )}
      </AsyncView>
    </Screen>
  );
}
