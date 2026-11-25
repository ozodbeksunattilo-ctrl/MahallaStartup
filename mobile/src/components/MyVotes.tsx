import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { PressableScale } from './PressableScale';
import { Text } from './Text';
import { useTheme } from '@/theme';

interface VotesSummary {
  round: unknown;
  myVotes: Array<{ issueId: string; title: string; slot: number }>;
}

/** Joriy davrda qaysi muammolarga ovoz berilgani (GET /rounds/current -> myVotes). Bosilsa muammo ochiladi. */
export function MyVotes({
  round,
  onHero = false,
  title = 'Siz ovoz bergan muammolar',
}: {
  round: VotesSummary;
  /** To'q yashil fon ustida (lenta tepasidagi blok) */
  onHero?: boolean;
  title?: string;
}) {
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();
  if (!round.round || round.myVotes.length === 0) return null;

  const fg = onHero ? colors.primaryText : colors.text;
  const muted = onHero ? colors.onHeroMuted : colors.muted;
  return (
    <Animated.View layout={LinearTransition} style={{ gap: 6 }}>
      <Text variant="eyebrow" style={onHero ? { color: colors.accent } : undefined}>
        {title}
      </Text>
      {[...round.myVotes]
        .sort((a, b) => a.slot - b.slot)
        .map((v) => (
          <Animated.View key={v.issueId} entering={FadeIn.duration(250)}>
            <PressableScale
              accessibilityRole="button"
              onPress={() => router.push(`/issues/${v.issueId}`)}
              scaleTo={0.98}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
                paddingVertical: 10,
                paddingHorizontal: spacing.md,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: onHero ? 'rgba(251,246,235,0.25)' : colors.border,
                backgroundColor: onHero ? 'rgba(251,246,235,0.08)' : colors.bg,
              }}
            >
              <Ionicons name="heart" size={16} color={onHero ? colors.accent : colors.secondary} />
              <Text style={{ flex: 1, color: fg, fontWeight: '600' }} numberOfLines={1} raw>
                {v.title}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={muted} />
            </PressableScale>
          </Animated.View>
        ))}
      <View />
    </Animated.View>
  );
}
