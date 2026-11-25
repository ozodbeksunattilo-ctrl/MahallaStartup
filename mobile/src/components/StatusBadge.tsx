import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { Text } from './Text';
import { useTheme, type ToneName } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;

// Rang holatning yagona belgisi emas: har bir holatda o'z ikonkasi bor (TZ 6-bo'lim «Dizayn»).
export const STATUS_STYLE: Record<string, { icon: IconName; tone: ToneName | 'muted' }> = {
  PENDING_REVIEW: { icon: 'hourglass', tone: 'orange' },
  REJECTED: { icon: 'alert-circle', tone: 'rose' },
  OPEN: { icon: 'thumbs-up-outline', tone: 'blue' },
  MERGED: { icon: 'git-merge', tone: 'muted' },
  SELECTED: { icon: 'trophy-outline', tone: 'purple' },
  IN_PROGRESS: { icon: 'construct-outline', tone: 'blue' },
  REFERRED: { icon: 'paper-plane', tone: 'orange' },
  RESOLVED: { icon: 'checkmark-circle', tone: 'green' },
  CANCELLED: { icon: 'close-circle', tone: 'rose' },
  COMPLETED: { icon: 'checkmark-done-circle', tone: 'green' },
  PUBLISHED: { icon: 'calendar', tone: 'blue' },
  DRAFT: { icon: 'document-outline', tone: 'muted' },
};

export function useStatusColors(status: string): { fg: string; soft: string; icon: IconName } {
  const { colors, tones } = useTheme();
  const s = STATUS_STYLE[status] ?? { icon: 'ellipse' as IconName, tone: 'muted' as const };
  const c = s.tone === 'muted' ? { fg: colors.muted, soft: colors.surfaceAlt } : tones[s.tone];
  return { ...c, icon: s.icon };
}

/** «Jonli» nuqta: ovoz berish davom etayotganini bildiradi. */
function LiveDot({ color }: { color: string }) {
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.set(withRepeat(withTiming(1, { duration: 1100 }), -1, false));
  }, [pulse]);
  const ring = useAnimatedStyle(() => ({ opacity: 0.55 * (1 - pulse.get()), transform: [{ scale: 1 + pulse.get() * 1.6 }] }));
  return (
    <View style={{ width: 8, height: 8, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[{ position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: color }, ring]} />
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
    </View>
  );
}

interface StatusBadgeProps {
  status: string;
  label: string;
  /** Rasm ustida (dizaynda fon bir xil; moslik uchun qoldirilgan) */
  onImage?: boolean;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, label, size = 'sm' }: StatusBadgeProps) {
  const { radius } = useTheme();
  const c = useStatusColors(status);
  const md = size === 'md';
  return (
    <View
      accessibilityLabel={`Holat: ${label}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 6,
        backgroundColor: c.soft,
        borderRadius: radius.pill,
        paddingHorizontal: md ? 12 : 10,
        paddingVertical: md ? 6 : 4,
      }}
    >
      {status === 'OPEN' ? <LiveDot color={c.fg} /> : <Ionicons name={c.icon} size={md ? 15 : 13} color={c.fg} />}
      <Text variant="label" style={{ color: c.fg, fontSize: md ? 13 : 12, fontWeight: '600' }}>
        {label}
      </Text>
    </View>
  );
}

/** Haftalik muammo belgisi: g'olib 1 hafta ichida hal qilinadi. */
export function WeeklyTag() {
  const { colors, radius } = useTheme();
  return (
    <View
      accessibilityLabel="Haftalik muammo"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 4,
        borderWidth: 1,
        borderColor: colors.secondary,
        borderRadius: radius.pill,
        paddingHorizontal: 8,
        paddingVertical: 3,
      }}
    >
      <Ionicons name="flash-outline" size={12} color={colors.secondary} />
      <Text variant="label" style={{ color: colors.secondary, fontSize: 12 }}>
        Haftalik
      </Text>
    </View>
  );
}
