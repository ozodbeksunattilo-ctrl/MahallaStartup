import { useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { useCallback, type ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';

/** Ekran tepasidagi to'q yashil sarlavha bloki (status bar ostigacha cho'ziladi). Dizayn: tekis rang, gradient yo'q. */
export function Hero({ children, extraBottom = 0 }: { children: ReactNode; extraBottom?: number }) {
  const insets = useSafeAreaInsets();
  const { colors, spacing } = useTheme();
  useLightStatusBar();
  return (
    <View
      style={{
        backgroundColor: colors.primaryDark,
        paddingTop: insets.top + spacing.lg,
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xl + extraBottom,
        gap: spacing.xs,
      }}
    >
      {children}
    </View>
  );
}

/** To'q yashil sarlavha ko'ringan ekranda status bar ikonkalari oq; ekrandan chiqilganda yana to'q. */
export function useLightStatusBar() {
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light');
      return () => setStatusBarStyle('dark');
    }, []),
  );
}
