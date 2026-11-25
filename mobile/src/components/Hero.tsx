import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';

/** Deep green band at the top of a screen (reaches under the status bar), like the landing's voting section. */
export function Hero({ children, extraBottom = 0 }: { children: ReactNode; extraBottom?: number }) {
  const insets = useSafeAreaInsets();
  const { colors, spacing } = useTheme();
  return (
    <View
      style={{
        paddingTop: insets.top + spacing.lg,
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xl + extraBottom,
        backgroundColor: colors.hero,
        gap: spacing.xs,
      }}
    >
      {children}
    </View>
  );
}
