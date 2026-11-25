import { Platform } from 'react-native';
import { fonts, useTheme } from '@/theme';

/** Barcha Stack layout'lar uchun umumiy sarlavha uslubi. */
export function useStackScreenOptions() {
  const { colors } = useTheme();
  return {
    headerStyle: { backgroundColor: colors.bg },
    headerTintColor: colors.primary,
    headerTitleStyle: { fontFamily: fonts.serif, fontSize: 20, color: colors.text },
    headerTitleAlign: 'center' as const,
    headerBackButtonDisplayMode: 'minimal' as const,
    headerShadowVisible: false,
    // Android'da ham iOS uslubidagi yon tomondan silliq o'tish (fade_from_bottom «sakrab» ko'rinardi)
    animation: Platform.OS === 'android' ? ('ios_from_right' as const) : ('default' as const),
    contentStyle: { backgroundColor: colors.bg },
  };
}
