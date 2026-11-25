import { Platform } from 'react-native';
import { useTheme } from '@/theme';

/** Barcha Stack layout'lar uchun umumiy sarlavha uslubi. */
export function useStackScreenOptions() {
  const { colors, fonts } = useTheme();
  return {
    headerStyle: { backgroundColor: colors.bg },
    headerTintColor: colors.primary,
    headerTitleStyle: { fontFamily: fonts.serif, fontSize: 20, color: colors.text },
    headerTitleAlign: 'center' as const,
    headerBackButtonDisplayMode: 'minimal' as const,
    headerShadowVisible: false,
    animation: Platform.OS === 'android' ? ('fade_from_bottom' as const) : ('default' as const),
    contentStyle: { backgroundColor: colors.bg },
  };
}
