import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, View } from 'react-native';
import { StatusBadge } from './StatusBadge';
import { Text } from './Text';
import { timeAgo } from '@/lib/format';
import type { IssueListItem } from '@/lib/types';
import { useTheme } from '@/theme';

interface IssueCardProps {
  issue: IssueListItem;
  onPress: () => void;
  /** Ovozga ochiq postlarda «Ovoz berish» tugmasi chiqadi */
  onVote?: (issue: IssueListItem) => void;
  voting?: boolean;
  /** Ro'yxatdagi o'rni: kirish animatsiyasi kechikishi uchun */
  index?: number;
}

export function IssueCard({ issue, onPress, onVote, voting }: IssueCardProps) {
  const { colors, radius, spacing, shadow } = useTheme();
  const votable = onVote !== undefined && issue.status === 'OPEN' && issue.voteCount !== null;

  return (
    <View
      style={[
        { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' },
        shadow.sm,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${issue.title}. ${issue.statusLabel}`}
        onPress={onPress}
        style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
      >
        {issue.thumbUrl ? (
          <View>
            <Image
              source={{ uri: issue.thumbUrl }}
              style={{ width: '100%', height: 150, backgroundColor: colors.surfaceAlt }}
              contentFit="cover"
              transition={200}
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.45)']}
              style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 70 }}
            />
            <View
              style={{
                position: 'absolute',
                left: spacing.md,
                bottom: spacing.sm,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <Ionicons name="pricetag" size={12} color="#fff" />
              <Text variant="label" style={{ color: '#fff', fontSize: 12 }}>
                {issue.categoryLabel}
              </Text>
            </View>
            <View style={{ position: 'absolute', top: spacing.sm, right: spacing.sm }}>
              <StatusBadge status={issue.status} label={issue.statusLabel} />
            </View>
          </View>
        ) : (
          <View style={{ padding: spacing.md, paddingBottom: 0 }}>
            <StatusBadge status={issue.status} label={issue.statusLabel} />
          </View>
        )}

        <View style={{ padding: spacing.md, gap: 6 }}>
          <Text variant="heading" numberOfLines={2}>
            {issue.title}
          </Text>
          <Text variant="muted" numberOfLines={1}>
            <Ionicons name="location-outline" size={13} color={colors.muted} /> {issue.locationText} ·{' '}
            {timeAgo(issue.createdAt)}
          </Text>
        </View>
      </Pressable>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: spacing.md,
          paddingBottom: spacing.md,
          gap: spacing.sm,
        }}
      >
        <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
          {issue.voteCount !== null ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="thumbs-up" size={15} color={colors.primary} />
              <Text variant="label">{issue.voteCount}</Text>
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="chatbubble-ellipses-outline" size={15} color={colors.muted} />
            <Text variant="label" style={{ color: colors.muted }}>
              {issue.commentCount}
            </Text>
          </View>
        </View>
        {votable ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: issue.myVote, busy: voting }}
            disabled={voting}
            onPress={() => onVote?.(issue)}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              minHeight: 44,
              paddingHorizontal: spacing.lg,
              borderRadius: radius.pill,
              backgroundColor: issue.myVote ? colors.primary : colors.primarySoft,
              opacity: voting ? 0.5 : 1,
              transform: [{ scale: pressed ? 0.96 : 1 }],
            })}
          >
            <Ionicons
              name={issue.myVote ? 'checkmark-circle' : 'thumbs-up-outline'}
              size={18}
              color={issue.myVote ? colors.primaryText : colors.primary}
            />
            <Text
              variant="label"
              style={{ color: issue.myVote ? colors.primaryText : colors.primary, fontSize: 14, fontWeight: '700' }}
            >
              {issue.myVote ? 'Ovoz berdingiz' : 'Ovoz berish'}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
