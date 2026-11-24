import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Logo } from './Logo';

/** Pastdagi to'lgich shuncha vaqtda to'liq to'ladi. */
const FILL_MS = 2600;
const BAR_WIDTH = 200;
const SPLASH_BLUE = '#2563eb';
const SPLASH_GREEN = '#1f8a4c';

/** Ilova ochilganda: oq fon, markazda logotip, ostida ko'k→yashil to'lib boruvchi to'lgich; to'lgach ilovaga o'tadi. */
export function AnimatedSplash({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const scale = useSharedValue(0.85);
  const fill = useSharedValue(0);
  const opacity = useSharedValue(1);
  const doneRef = useRef(onDone);
  const readyRef = useRef(ready);
  const filledRef = useRef(false);

  // Animatsiya callback'lari eng yangi qiymatlarni o'qishi uchun ref'lar effektda yangilanadi
  useEffect(() => {
    doneRef.current = onDone;
    readyRef.current = ready;
  });

  const finish = () => doneRef.current();
  const fadeOut = () => {
    opacity.value = withTiming(0, { duration: 400 }, (done) => {
      if (done) runOnJS(finish)();
    });
  };
  const onFilled = () => {
    filledRef.current = true;
    if (readyRef.current) fadeOut();
  };

  useEffect(() => {
    scale.value = withSpring(1, { damping: 14, stiffness: 70 });
    fill.value = withDelay(
      200,
      withTiming(1, { duration: FILL_MS, easing: Easing.inOut(Easing.cubic) }, (done) => {
        if (done) runOnJS(onFilled)();
      }),
    );
    // Animatsiya callback'i ishlamasa ham splash yopiladi
    const fallback = setTimeout(finish, FILL_MS + 3000);
    return () => clearTimeout(fallback);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // To'lgich to'lgan, lekin sessiya keyin aniqlangan bo'lsa — shu yerda yopiladi
  useEffect(() => {
    if (ready && filledRef.current) fadeOut();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const logoStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const rootStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const barStyle = useAnimatedStyle(() => ({ width: BAR_WIDTH * fill.value }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#ffffff' }, rootStyle]} pointerEvents="auto">
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', gap: 36 }]}>
        <Animated.View style={logoStyle}>
          <Logo size={170} full />
        </Animated.View>
        <View
          style={{
            width: BAR_WIDTH,
            height: 8,
            borderRadius: 4,
            backgroundColor: 'rgba(15,34,24,0.10)',
            overflow: 'hidden',
          }}
        >
          <Animated.View style={[{ height: 8, borderRadius: 4, overflow: 'hidden' }, barStyle]}>
            <LinearGradient
              colors={[SPLASH_BLUE, SPLASH_GREEN]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ width: BAR_WIDTH, height: 8 }}
            />
          </Animated.View>
        </View>
      </View>
    </Animated.View>
  );
}
