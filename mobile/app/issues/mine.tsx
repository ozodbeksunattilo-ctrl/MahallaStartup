import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState } from '@/components/EmptyState';
import { IssueCard } from '@/components/IssueCard';
import { ErrorState, Loading } from '@/components/StateView';
import { Text } from '@/components/Text';
import { usePaged } from '@/lib/hooks';
import type { IssueListItem } from '@/lib/types';
import { useTheme } from '@/theme';

// API: GET /issues/mine (hamma holatda; rad sababi va dublikat bilan)
export default function MyIssuesScreen() {
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const list = usePaged<IssueListItem>('/issues/mine');

  const { refresh } = list;
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['left', 'right', 'bottom']}>
      <FlatList
        data={list.items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
        renderItem={({ item, index }) => (
          <View style={{ gap: 6 }}>
            <IssueCard index={index} issue={item} onPress={() => router.push(`/issues/${item.id}`)} />
            {item.status === 'REJECTED' && item.rejectedReason ? (
              <Text variant="muted" style={{ color: colors.danger, paddingHorizontal: 4 }}>
                Sabab: {item.rejectedReason}
              </Text>
            ) : null}
            {item.duplicateOf ? (
              <Text variant="muted" style={{ paddingHorizontal: 4 }}>
                Birlashtirildi: «{item.duplicateOf.title}»
              </Text>
            ) : null}
          </View>
        )}
        ListEmptyComponent={
          list.loading ? (
            <Loading />
          ) : list.error ? (
            <ErrorState message={list.error} onRetry={list.reload} />
          ) : (
            <EmptyState
              title="Hali muammo yubormagansiz"
              hint="Mahallangizdagi muammoni rasm bilan yuboring."
              actionTitle="Muammo yuborish"
              onAction={() => router.push('/issues/new')}
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
