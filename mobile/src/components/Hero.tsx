import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';

/** Ekran tepasidagi brend gradientli sarlavha bloki (status bar ostigacha cho'ziladi). */
export function Hero({ children, extraBottom = 0 }: { children: ReactNode; extraBottom?: number }) {
  const insets = useSafeAreaInsets();
  const { colors, spacing, radius } = useTheme();
  return (
    <LinearGradient
      colors={[colors.primary, colors.secondary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        paddingTop: insets.top + spacing.lg,
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xl + extraBottom,
        borderBottomLeftRadius: radius.xl,
        borderBottomRightRadius: radius.xl,
        overflow: 'hidden',
        gap: spacing.xs,
      }}
    >
      {/* Bezak: ikkita yumshoq doira */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          right: -50,
          top: -40,
          width: 190,
          height: 190,
          borderRadius: 95,
          backgroundColor: 'rgba(255,255,255,0.08)',
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          right: 60,
          bottom: -70,
          width: 140,
          height: 140,
          borderRadius: 70,
          backgroundColor: 'rgba(245,158,11,0.20)',
        }}
      />
      <View style={{ gap: spacing.xs }}>
        {children}
      </View>
    </LinearGradient>
  );
}
