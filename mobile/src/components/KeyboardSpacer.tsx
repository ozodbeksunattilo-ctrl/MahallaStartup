import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

/**
 * Pastki kiritish paneli (chat, izoh) ostiga qo'yiladi: klaviatura chiqqanda xuddi uning balandligicha
 * kengayadi, panel klaviatura bilan birga ko'tariladi va ro'yxat qisqaradi.
 * `offset` — ekran pastidan panelgacha bo'lgan masofa (masalan, tab bar), u klaviatura ichiga «kiradi».
 */
export function KeyboardSpacer({ offset = 0 }: { offset?: number }) {
  const { height } = useReanimatedKeyboardAnimation();
  const style = useAnimatedStyle(() => ({ height: Math.max(0, -height.get() - offset) }));
  return <Animated.View style={style} />;
}
