import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { PressableScale } from './PressableScale';
import { StatusBadge, WeeklyTag } from './StatusBadge';
import { Text } from './Text';
import { VoteButton } from './VoteButton';
import { timeAgo } from '@/lib/format';
import { CATEGORY_STYLE } from '@/lib/labels';
import type { IssueListItem } from '@/lib/types';
import { useTheme } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;

interface IssueCardProps {
  issue: IssueListItem;
  onPress: () => void;
  /** Ovozga ochiq postlarda «Ovoz berish» tugmasi chiqadi */
  onVote?: (issue: IssueListItem) => void;
  voting?: boolean;
  /** Foydalanuvchida bu oy ovoz qolmagan */
  exhausted?: boolean;
  /** Ro'yxatdagi o'rni: kirish animatsiyasi kechikishi uchun */
  index?: number;
}

export function IssueCard({ issue, onPress, onVote, voting, exhausted = false, index = 0 }: IssueCardProps) {
  const { colors, radius, spacing, shadow } = useTheme();
  const votable = onVote !== undefined && issue.status === 'OPEN' && issue.voteCount !== null;
  const cat = CATEGORY_STYLE[issue.category] ?? CATEGORY_STYLE.OTHER;

  return (
    // Faqat birinchi ekrandagilar ketma-ket chiqadi; pastga aylantirilganda kechikish bo'lmaydi
    <Animated.View entering={FadeInDown.duration(380).delay(Math.min(index, 5) * 60)}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`${issue.title}. ${issue.statusLabel}`}
        onPress={onPress}
        scaleTo={0.985}
        haptics={false}
        style={[{ backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' }, shadow.sm]}
      >
        {issue.thumbUrl ? (
          <View>
            <Image
              source={{ uri: issue.thumbUrl }}
              style={{ width: '100%', height: 150, backgroundColor: colors.surfaceAlt }}
              contentFit="cover"
              transition={250}
            />
            {/* Pastki qorong'ilashtirish: toifa yozuvi rasm ustida o'qiladi */}
            <LinearGradient
              colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.45)']}
              style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 70 }}
            />
            <View style={{ position: 'absolute', top: spacing.sm, right: spacing.sm, alignItems: 'flex-end', gap: 4 }}>
              <StatusBadge status={issue.status} label={issue.statusLabel} />
            </View>
            {issue.roundKind === 'WEEKLY' ? (
              <View style={{ position: 'absolute', top: spacing.sm, left: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.pill }}>
                <WeeklyTag />
              </View>
            ) : null}
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
              <Ionicons name={cat?.icon as IconName} size={14} color="#fff" />
              <Text variant="label" style={{ color: '#fff', fontSize: 12 }}>
                {issue.categoryLabel}
              </Text>
            </View>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, paddingBottom: 0 }}>
            <StatusBadge status={issue.status} label={issue.statusLabel} />
            {issue.roundKind === 'WEEKLY' ? <WeeklyTag /> : null}
            <Text variant="muted" style={{ flex: 1, textAlign: 'right' }} numberOfLines={1}>
              {issue.categoryLabel}
            </Text>
          </View>
        )}

        <View style={{ padding: spacing.md, gap: 6 }}>
          <Text variant="heading" numberOfLines={2} raw>
            {issue.title}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="location-outline" size={13} color={colors.muted} />
            <Text variant="muted" numberOfLines={1} style={{ flexShrink: 1 }} raw>
              {issue.locationText}
            </Text>
            <Text variant="muted"> · {timeAgo(issue.createdAt)}</Text>
          </View>
        </View>

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
              <View accessibilityLabel={`${issue.voteCount} ovoz`} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name={issue.myVote ? 'heart' : 'heart-outline'} size={15} color={colors.text} />
                <Text variant="label">{String(issue.voteCount)}</Text>
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="chatbubble-ellipses-outline" size={15} color={colors.muted} />
              <Text variant="label" style={{ color: colors.muted }}>
                {String(issue.commentCount)}
              </Text>
            </View>
            {issue.isFollowing ? <Ionicons name="eye-outline" size={15} color={colors.muted} /> : null}
          </View>
          {votable ? (
            <VoteButton
              voted={issue.myVote}
              count={null}
              busy={voting}
              exhausted={exhausted && !issue.myVote}
              onPress={() => onVote?.(issue)}
            />
          ) : null}
        </View>
      </PressableScale>
    </Animated.View>
  );
}
