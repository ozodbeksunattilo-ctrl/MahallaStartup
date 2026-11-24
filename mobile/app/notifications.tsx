import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState, Loading } from '@/components/StateView';
import { Text } from '@/components/Text';
import { api } from '@/lib/api';
import { timeAgo } from '@/lib/format';
import { usePaged } from '@/lib/hooks';
import { NOTIFICATION_ICONS } from '@/lib/labels';
import { openEntity } from '@/lib/push';
import type { AppNotification } from '@/lib/types';
import { useTheme } from '@/theme';

// API: GET /notifications · POST /notifications/:id/read · POST /notifications/read-all
export default function NotificationsScreen() {
  const router = useRouter();
  const { colors, spacing, radius, shadow } = useTheme();
  const list = usePaged<AppNotification>('/notifications');
  const unread = list.items.filter((n) => !n.read).length;

  function open(n: AppNotification) {
    if (!n.read) {
      list.setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      void api(`/notifications/${n.id}/read`, { method: 'POST' }).catch(() => undefined);
    }
    openEntity(router, n.entityType, n.entityId);
  }

  async function readAll() {
    list.setItems((prev) => prev.map((x) => ({ ...x, read: true })));
    await api('/notifications/read-all', { method: 'POST' }).catch(() => void list.refresh());
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          headerRight: () =>
            unread > 0 ? (
              <Text
                variant="label"
                accessibilityRole="button"
                onPress={() => void readAll()}
                style={{ color: colors.primary, padding: 8 }}
              >
                Hammasini o‘qish
              </Text>
            ) : null,
        }}
      />
      <FlatList
        data={list.items}
        keyExtractor={(n) => n.id}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
        renderItem={({ item: n }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${n.read ? '' : 'Yangi. '}${n.title}`}
            onPress={() => open(n)}
            style={({ pressed }) => [
              {
                flexDirection: 'row',
                gap: spacing.md,
                backgroundColor: colors.surface,
                borderRadius: radius.lg,
                padding: spacing.md,
                transform: [{ scale: pressed ? 0.985 : 1 }],
              },
              shadow.sm,
            ]}
          >
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                backgroundColor: n.read ? colors.surfaceAlt : colors.primarySoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons
                name={(NOTIFICATION_ICONS[n.type] ?? 'notifications-outline') as keyof typeof Ionicons.glyphMap}
                size={21}
                color={n.read ? colors.muted : colors.primary}
              />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text variant="heading" style={{ flex: 1, fontSize: 15, fontWeight: n.read ? '600' : '800' }} numberOfLines={2}>
                  {n.title}
                </Text>
                {!n.read ? (
                  <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: colors.accent }} />
                ) : null}
              </View>
              <Text variant="muted" numberOfLines={3}>
                {n.body}
              </Text>
              <Text variant="muted" style={{ fontSize: 12, opacity: 0.8 }}>
                {timeAgo(n.createdAt)}
              </Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          list.loading ? (
            <Loading />
          ) : list.error ? (
            <ErrorState message={list.error} onRetry={list.reload} />
          ) : (
            <EmptyState title="Bildirishnomalar yo'q" hint="Post holati, g'olib muammo va tadbirlar haqida shu yerda xabar olasiz." />
          )
        }
        ListFooterComponent={list.loadingMore ? <ActivityIndicator color={colors.primary} /> : undefined}
        onEndReached={() => void list.loadMore()}
        refreshControl={
          <RefreshControl refreshing={list.refreshing} onRefresh={() => void list.refresh()} tintColor={colors.primary} />
        }
      />
    </SafeAreaView>
  );
}
