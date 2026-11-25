import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { haptic } from '@/lib/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  /** Bosilganda qancha kichrayadi (1 — umuman yo'q) */
  scaleTo?: number;
  /** Bosilganda yengil tebranish */
  haptics?: boolean;
}

const SPRING = { damping: 18, stiffness: 320, mass: 0.6 };

/** Bosilganda yumshoq «prujina» bilan kichrayib-qaytadigan tugma asosi (UI thread'da, kechikishsiz). */
export function PressableScale({ style, scaleTo = 0.97, haptics = true, onPressIn, onPressOut, onPress, disabled, ...props }: PressableScaleProps) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <AnimatedPressable
      {...props}
      disabled={disabled}
      onPressIn={(e) => {
        scale.set(withSpring(scaleTo, SPRING));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.set(withSpring(1, SPRING));
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptics) haptic.tap();
        onPress?.(e);
      }}
      style={[style, animated]}
    />
  );
}
