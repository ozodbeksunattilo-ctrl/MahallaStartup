import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Chips } from '@/components/Chips';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState, Loading } from '@/components/StateView';
import { StatusBadge } from '@/components/StatusBadge';
import { Text } from '@/components/Text';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { errorMessage, usePaged } from '@/lib/hooks';
import { EVENT_STATUS } from '@/lib/labels';
import type { EventItem } from '@/lib/types';
import { useTheme } from '@/theme';

const SCOPES = [
  { value: 'upcoming', label: 'Kelgusi' },
  { value: 'past', label: "O'tgan" },
];

// API: GET /events?scope=upcoming|past  ·  PUT/DELETE /events/:id/rsvp
export default function EventsScreen() {
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();
  const [scope, setScope] = useState<string | null>('upcoming');
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const list = usePaged<EventItem>(`/events?scope=${scope ?? 'upcoming'}`);

  const { refresh } = list;
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  async function toggleRsvp(ev: EventItem) {
    setBusy(ev.id);
    setNotice(null);
    try {
      const res = await api<{ going: boolean; rsvpCount: number }>(`/events/${ev.id}/rsvp`, {
        method: ev.myRsvp ? 'DELETE' : 'PUT',
      });
      // DELETE 204 qaytarishi mumkin: shunda qiymatni o'zimiz hisoblaymiz
      const going = res ? res.going : !ev.myRsvp;
      const count = res ? res.rsvpCount : Math.max(0, ev.rsvpCount - 1);
      list.setItems((prev) => prev.map((i) => (i.id === ev.id ? { ...i, myRsvp: going, rsvpCount: count } : i)));
    } catch (e) {
      setNotice(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['left', 'right']}>
      <FlatList
        data={list.items}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
        ListHeaderComponent={
          <View style={{ gap: spacing.md, paddingBottom: spacing.sm }}>
            <Chips options={SCOPES} value={scope} onChange={setScope} allowAll={false} />
            {notice ? <Text style={{ color: colors.danger }}>{notice}</Text> : null}
          </View>
        }
        renderItem={({ item: ev }) => {
          const canRsvp = ev.status === 'PUBLISHED' && scope === 'upcoming';
          return (
            <View
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: radius.md,
                padding: spacing.md,
                gap: spacing.sm,
              }}
            >
              <Pressable accessibilityRole="button" onPress={() => router.push(`/events/${ev.id}`)} style={{ gap: 6 }}>
                <Text variant="heading">{ev.title}</Text>
                <Text variant="muted">
                  <Ionicons name="calendar-outline" size={13} color={colors.muted} /> {formatDateTime(ev.startsAt)}
                </Text>
                <Text variant="muted">
                  <Ionicons name="location-outline" size={13} color={colors.muted} /> {ev.location}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <StatusBadge status={ev.status} label={EVENT_STATUS[ev.status] ?? ev.status} />
                  <Text variant="muted">{ev.rsvpCount} kishi qatnashadi</Text>
                </View>
              </Pressable>
              {canRsvp ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: ev.myRsvp, busy: busy === ev.id }}
                  disabled={busy === ev.id}
                  onPress={() => void toggleRsvp(ev)}
                  style={({ pressed }) => ({
                    minHeight: 46,
                    borderRadius: radius.md,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 8,
                    borderWidth: 1,
                    borderColor: colors.primary,
                    backgroundColor: ev.myRsvp ? colors.primary : 'transparent',
                    opacity: busy === ev.id ? 0.5 : pressed ? 0.85 : 1,
                  })}
                >
                  <Ionicons
                    name={ev.myRsvp ? 'checkmark-circle' : 'add-circle-outline'}
                    size={20}
                    color={ev.myRsvp ? colors.primaryText : colors.primary}
                  />
                  <Text variant="label" style={{ fontSize: 15, color: ev.myRsvp ? colors.primaryText : colors.primary }}>
                    {ev.myRsvp ? "Qatnashasiz (bekor qilish)" : 'Qatnashaman'}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          );
        }}
        ListEmptyComponent={
          list.loading ? (
            <Loading />
          ) : list.error ? (
            <ErrorState message={list.error} onRetry={list.reload} />
          ) : (
            <EmptyState
              title={scope === 'past' ? "O'tgan tadbirlar yo'q" : "Kelgusi tadbirlar yo'q"}
              hint="Admin yangi tadbir nashr qilganda shu yerda ko'rinadi."
            />
          )
        }
        ListFooterComponent={list.loadingMore ? <ActivityIndicator color={colors.primary} /> : undefined}
        onEndReached={() => void list.loadMore()}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl refreshing={list.refreshing} onRefresh={() => void list.refresh()} tintColor={colors.primary} />
        }
      />
    </SafeAreaView>
  );
}
