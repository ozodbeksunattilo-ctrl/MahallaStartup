import { Pressable, View } from 'react-native';
import { Pill } from './Pill';
import { Text } from './Text';
import { useTheme } from '@/theme';
import type { IssueListItem } from '@/lib/types';

const STATUS_TONE: Record<string, 'neutral' | 'info' | 'success' | 'warning' | 'danger'> = {
  PENDING_REVIEW: 'neutral',
  OPEN: 'info',
  REJECTED: 'danger',
  MERGED: 'neutral',
  SELECTED: 'success',
  IN_PROGRESS: 'warning',
  REFERRED: 'warning',
  RESOLVED: 'success',
};

export function IssueRow({ item, onPress }: { item: IssueListItem; onPress: () => void }) {
  const { colors, spacing, radius } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: radius.md,
        padding: spacing.md,
        gap: spacing.xs,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }}>
        <Pill label={item.categoryLabel} />
        <Pill label={item.statusLabel} tone={STATUS_TONE[item.status] ?? 'neutral'} />
      </View>
      <Text variant="heading" raw>
        {item.title}
      </Text>
      <Text variant="muted">{item.locationText}</Text>
      {item.rejectedReason ? (
        <Text variant="muted" style={{ color: colors.danger }}>
          Sabab: {item.rejectedReason}
        </Text>
      ) : null}
      <View style={{ flexDirection: 'row', gap: spacing.lg, marginTop: spacing.xs }}>
        <Text variant="muted">👍 {item.voteCount ?? 0}</Text>
        <Text variant="muted">💬 {item.commentCount}</Text>
        {item.isFollowing ? <Text variant="muted">★ Kuzatilmoqda</Text> : null}
      </View>
    </Pressable>
  );
}
