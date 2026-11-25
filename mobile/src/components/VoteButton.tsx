import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeOutDown,
  FadeOutUp,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { PressableScale } from './PressableScale';
import { Text } from './Text';
import { fonts, useTheme } from '@/theme';

interface VoteButtonProps {
  voted: boolean;
  count: number | null;
  onPress: () => void;
  busy?: boolean;
  /** Ovoz qolmagan (va bu postga hali berilmagan): tugma xira, bosilganda sabab ko'rsatiladi */
  exhausted?: boolean;
  /** `lg` — muammo sahifasidagi katta tugma */
  size?: 'sm' | 'lg';
}

/** Ovoz berish tugmasi: holat bir qarashda ko'rinadi, hisob animatsiya bilan o'zgaradi. */
export function VoteButton({ voted, count, onPress, busy = false, exhausted = false, size = 'sm' }: VoteButtonProps) {
  const { colors, radius, spacing } = useTheme();
  const lg = size === 'lg';
  const pop = useSharedValue(1);
  // Hisob oshsa raqam pastdan, kamaysa tepadan kiradi (oldingi qiymatdan hosil qilingan holat)
  const [last, setLast] = useState(count);
  const [up, setUp] = useState(true);
  if (count !== last) {
    setUp((count ?? 0) >= (last ?? 0));
    setLast(count);
  }

  useEffect(() => {
    if (voted) pop.set(withSequence(withSpring(1.35, { damping: 6, stiffness: 400 }), withSpring(1, { damping: 10 })));
  }, [voted, pop]);
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.get() }] }));

  const bg = voted ? colors.primary : exhausted ? colors.surfaceAlt : colors.primarySoft;
  const fg = voted ? colors.primaryText : exhausted ? colors.muted : colors.primary;
  const label = voted ? 'Ovoz berdingiz' : exhausted ? 'Ovozlar tugadi' : 'Ovoz berish';

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: voted, busy, disabled: busy }}
      disabled={busy}
      haptics={false}
      scaleTo={0.94}
      onPress={onPress}
      style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
          minHeight: lg ? 52 : 44,
          paddingLeft: lg ? spacing.lg : spacing.md,
          paddingRight: count !== null ? 6 : lg ? spacing.lg : spacing.md,
          borderRadius: radius.pill,
          backgroundColor: bg,
        }}
    >
      {busy ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        <Animated.View style={iconStyle}>
          <Ionicons name={voted ? 'heart' : exhausted ? 'lock-closed' : 'heart-outline'} size={lg ? 22 : 18} color={fg} />
        </Animated.View>
      )}
      <Text variant="label" style={{ color: fg, fontSize: lg ? 16 : 14, fontWeight: '700', flexShrink: 1 }} numberOfLines={1}>
        {label}
      </Text>
      {count !== null ? (
        <View
          style={{
            minWidth: lg ? 40 : 32,
            height: lg ? 40 : 30,
            paddingHorizontal: 8,
            borderRadius: radius.pill,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            backgroundColor: voted ? 'rgba(255,255,255,0.22)' : colors.surface,
          }}
        >
          <Animated.Text
            key={count}
            entering={(up ? FadeInUp : FadeInDown).duration(220)}
            exiting={(up ? FadeOutUp : FadeOutDown).duration(160)}
            style={{ color: fg, fontFamily: fonts.bold, fontSize: lg ? 16 : 14 }}
          >
            {count}
          </Animated.Text>
        </View>
      ) : null}
    </PressableScale>
  );
}
