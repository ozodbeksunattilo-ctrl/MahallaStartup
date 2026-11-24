import { useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState, Loading } from '@/components/StateView';
import { StatusBadge } from '@/components/StatusBadge';
import { Text } from '@/components/Text';
import { monthName } from '@/lib/format';
import { usePaged } from '@/lib/hooks';
import type { RoundListItem } from '@/lib/types';
import { useTheme } from '@/theme';

// API: GET /rounds
export default function RoundsScreen() {
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();
  const list = usePaged<RoundListItem>('/rounds');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['left', 'right', 'bottom']}>
      <FlatList
        data={list.items}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
        renderItem={({ item: r }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/rounds/${r.id}`)}
            style={({ pressed }) => ({
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: radius.md,
              padding: spacing.md,
              gap: 6,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text variant="heading">
              {monthName(r.periodStart)} oyi, {r.periodStart.slice(0, 4)}
            </Text>
            <StatusBadge
              status={r.status === 'OPEN' ? 'OPEN' : 'COMPLETED'}
              label={r.status === 'OPEN' ? 'Ovoz berilmoqda' : 'Yakunlangan'}
            />
            {r.status === 'CLOSED' ? (
              <Text variant="muted">
                {r.winner ? `G‘olib: ${r.winner.title} (${r.winner.votes} ovoz)` : 'Bu oy g‘olib aniqlanmadi'}
              </Text>
            ) : null}
          </Pressable>
        )}
        ListEmptyComponent={
          list.loading ? (
            <Loading />
          ) : list.error ? (
            <ErrorState message={list.error} onRetry={list.reload} />
          ) : (
            <EmptyState title="Davrlar yo'q" />
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
