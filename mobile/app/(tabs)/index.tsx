import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Logo } from '@/components/Logo';
import { MyVotes } from '@/components/MyVotes';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Hero } from '@/components/Hero';
import { PressableScale } from '@/components/PressableScale';
import { Screen } from '@/components/Screen';
import { AsyncView } from '@/components/StateView';
import { StatusBadge } from '@/components/StatusBadge';
import { Text } from '@/components/Text';
import { formatDay, formatTime, monthName, timeAgo, timeLeft } from '@/lib/format';
import { useFetch } from '@/lib/hooks';
import { ADMIN_READONLY_HINT } from '@/lib/role';
import type { CurrentRound, Home, Me } from '@/lib/types';
import { useTheme } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;

const ACTIONS: Array<{ icon: IconName; label: string; href: string }> = [
  { icon: 'add-circle-outline', label: 'Muammo\nyuborish', href: '/issues/new' },
  { icon: 'document-text-outline', label: 'Mening\nmuammolarim', href: '/issues/mine' },
  { icon: 'megaphone-outline', label: "E'lonlar", href: '/announcements' },
  { icon: 'trophy-outline', label: 'Oldingi\ndavrlar', href: '/rounds' },
];

// API: GET /home (bitta so'rov) + GET /me (mahalla nomi) + GET /rounds/current (qaysi muammolarga ovoz berilgan)
export default function HomeScreen() {
  const router = useRouter();
  const { colors, spacing, radius, shadow } = useTheme();
  const home = useFetch<Home>('/home');
  const me = useFetch<Me>('/me');
  const round = useFetch<CurrentRound>('/rounds/current');

  // Boshqa ekrandan qaytganda (ovoz berilgan, o'qilgan) yangilanadi
  const { refresh: refreshHome } = home;
  const { refresh: refreshRound } = round;
  useFocusEffect(
    useCallback(() => {
      void refreshHome();
      void refreshRound();
    }, [refreshHome, refreshRound]),
  );

  const unread = home.data?.unreadNotifications ?? 0;
  const firstName = me.data?.user.displayName.split(' ')[0];
  const isAdmin = me.data?.role === 'MAHALLA_ADMIN';
  // Admin muammo yubora olmaydi (backend: faqat aholi)
  const actions = isAdmin ? ACTIONS.filter((a) => a.href !== '/issues/new' && a.href !== '/issues/mine') : ACTIONS;

  return (
    <Screen
      onRefresh={() => {
        void home.refresh();
        void me.refresh();
        void round.refresh();
      }}
      refreshing={home.refreshing}
      header={
        <Hero extraBottom={56}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
            <View style={{ width: 52, height: 52, borderRadius: radius.md, backgroundColor: colors.primaryText, alignItems: 'center', justifyContent: 'center' }}>
              <Logo size={42} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="muted" style={{ color: colors.onHeroMuted }}>
                {firstName ? `Salom, ${firstName}` : 'Xush kelibsiz'}
              </Text>
              <Text variant="display" style={{ color: colors.primaryText }} numberOfLines={2} raw={me.data !== null}>
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
                borderWidth: 1,
                borderColor: 'rgba(251,246,235,0.3)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="notifications-outline" size={22} color={colors.primaryText} />
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
            <Animated.View
              entering={FadeInDown.duration(450)}
              style={[
                {
                  marginTop: -56 - spacing.lg,
                  backgroundColor: colors.surface,
                  borderRadius: radius.lg,
                  padding: spacing.lg,
                  gap: spacing.md,
                },
                shadow.sm,
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
                      <Text variant="display" style={{ color: colors.primary, fontSize: 34 }}>
                        {h.round.votesLeft}
                      </Text>
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text variant="eyebrow">Ovoz berish davri</Text>
                      <Text variant="heading">{h.round.votesLeft} ta ovoz qoldi</Text>
                      <Text variant="muted">{timeLeft(h.round.periodEnd)} qoldi · oyiga 3 ta</Text>
                    </View>
                  </View>
                  {/* Qaysi muammolarga ovoz berilgani — bosilsa muammo ochiladi */}
                  {round.data ? <MyVotes round={round.data} /> : null}
                  {isAdmin ? (
                    <Text variant="muted">{ADMIN_READONLY_HINT}</Text>
                  ) : (
                    <Button title="Ovoz berish" icon="thumbs-up-outline" onPress={() => router.push('/feed')} />
                  )}
                </>
              ) : (
                <>
                  <Text variant="heading">Hozir faol davr yo&apos;q</Text>
                  <Text variant="muted">Yangi ovoz berish davri boshlanganda xabar beramiz.</Text>
                </>
              )}
            </Animated.View>

            {/* Haftalik ovoz: oylik bilan parallel, alohida 3 ta ovoz */}
            {h.weeklyRound ? (
              <Animated.View entering={FadeInDown.duration(450).delay(40)}>
                <Card title="Haftalik ovoz" icon="flash-outline">
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text variant="heading">{h.weeklyRound.votesLeft} ta ovoz qoldi</Text>
                      <Text variant="muted">
                        {timeLeft(h.weeklyRound.periodEnd)} qoldi · g&apos;olib 1 hafta ichida hal qilinadi
                      </Text>
                    </View>
                  </View>
                  {round.data?.weekly ? <MyVotes round={round.data.weekly} title="Haftalik ovozlaringiz" /> : null}
                  {isAdmin ? null : (
                    <Button title="Haftalik muammolar" variant="secondary" onPress={() => router.push('/feed')} />
                  )}
                </Card>
              </Animated.View>
            ) : null}

            {/* Hafta muammosi: haftalik g'olib 1 hafta ichida hal qilinishi kerak */}
            {h.weeklyIssue ? (
              <Card title="Hafta muammosi" icon="flash-outline">
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push(`/issues/${h.weeklyIssue?.id}`)}
                  style={{ gap: spacing.sm }}
                >
                  <Text variant="heading" raw>
                    {h.weeklyIssue.title}
                  </Text>
                  <StatusBadge status={h.weeklyIssue.status} label={h.weeklyIssue.statusLabel} />
                  {h.weeklyIssue.dueDate ? (
                    <Text variant="muted">Hal qilish muddati: {formatDay(h.weeklyIssue.dueDate)}</Text>
                  ) : null}
                  <Text variant="label" style={{ color: colors.primary }}>
                    Batafsil ko&apos;rish →
                  </Text>
                </Pressable>
              </Card>
            ) : null}

            {/* Tezkor amallar */}
            <Animated.View entering={FadeInDown.duration(450).delay(80)} style={{ flexDirection: 'row', gap: spacing.sm }}>
              {actions.map((a) => (
                <PressableScale
                  key={a.href}
                  accessibilityRole="button"
                  onPress={() => router.push(a.href as never)}
                  scaleTo={0.94}
                  style={[
                    {
                      flex: 1,
                      alignItems: 'center',
                      gap: 8,
                      paddingVertical: spacing.md,
                      paddingHorizontal: 4,
                      backgroundColor: colors.surface,
                      borderRadius: radius.md,
                    },
                    shadow.sm,
                  ]}
                >
                  <View
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: radius.sm,
                      backgroundColor: colors.primarySoft,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name={a.icon} size={22} color={colors.primary} />
                  </View>
                  <Text variant="label" style={{ fontSize: 11, textAlign: 'center', lineHeight: 14 }}>
                    {a.label}
                  </Text>
                </PressableScale>
              ))}
            </Animated.View>

            {/* Oy muammosi */}
            <Animated.View entering={FadeInDown.duration(450).delay(160)}>
            <Card title="Oy muammosi" icon="trophy-outline">
              {h.featuredIssue ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push(`/issues/${h.featuredIssue?.id}`)}
                  style={{ gap: spacing.sm }}
                >
                  <Text variant="heading" raw>
                    {h.featuredIssue.title}
                  </Text>
                  <StatusBadge status={h.featuredIssue.status} label={h.featuredIssue.statusLabel} />
                  <Text variant="label" style={{ color: colors.primary }}>
                    Batafsil ko&apos;rish →
                  </Text>
                </Pressable>
              ) : (
                <Text variant="muted">Bu oy g&apos;olib yoki jarayondagi muammo hali yo&apos;q.</Text>
              )}
            </Card>
            </Animated.View>

            {/* Yaqin tadbir */}
            <Animated.View entering={FadeInDown.duration(450).delay(240)}>
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
                    <Text variant="label" style={{ color: colors.primaryText, opacity: 0.8 }}>
                      {monthName(h.nextEvent.startsAt).slice(0, 3)}
                    </Text>
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text variant="heading" numberOfLines={2} raw>
                      {h.nextEvent.title}
                    </Text>
                    <Text variant="muted" numberOfLines={1}>
                      {formatTime(h.nextEvent.startsAt)} · {h.nextEvent.location}
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
            </Animated.View>

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
                  borderWidth: 1,
                  borderColor: colors.accent,
                  borderRadius: radius.md,
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
                  <Text variant="eyebrow">
                    Muhim e&apos;lon
                  </Text>
                  <Text variant="heading" style={{ color: colors.text }} numberOfLines={2} raw>
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
