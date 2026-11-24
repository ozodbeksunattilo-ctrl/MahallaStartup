import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState, Loading } from '@/components/StateView';
import { Text } from '@/components/Text';
import { timeAgo } from '@/lib/format';
import { usePaged } from '@/lib/hooks';
import type { Announcement } from '@/lib/types';
import { useTheme } from '@/theme';

// API: GET /announcements
export default function AnnouncementsScreen() {
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();
  const list = usePaged<Announcement>('/announcements');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['left', 'right', 'bottom']}>
      <FlatList
        data={list.items}
        keyExtractor={(a) => a.id}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
        renderItem={({ item: a }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/announcements/${a.id}`)}
            style={({ pressed }) => ({
              backgroundColor: colors.surface,
              borderColor: a.isImportant ? colors.warning : colors.border,
              borderWidth: 1,
              borderRadius: radius.md,
              padding: spacing.md,
              gap: 4,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            {a.isImportant ? (
              <Text variant="label" style={{ color: colors.warning }}>
                <Ionicons name="megaphone-outline" size={14} color={colors.warning} /> MUHIM
              </Text>
            ) : null}
            <Text variant="heading">{a.title}</Text>
            <Text numberOfLines={2} variant="muted">
              {a.body}
            </Text>
            <Text variant="muted">{timeAgo(a.publishedAt ?? a.createdAt)}</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          list.loading ? (
            <Loading />
          ) : list.error ? (
            <ErrorState message={list.error} onRetry={list.reload} />
          ) : (
            <EmptyState title="E'lonlar yo'q" hint="Admin e'lon nashr qilganda shu yerda ko'rinadi." />
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
