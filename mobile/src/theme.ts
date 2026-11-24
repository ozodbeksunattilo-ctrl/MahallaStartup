import { Platform, useColorScheme, type ViewStyle } from 'react-native';

const light = {
  bg: '#f6faf7',
  surface: '#ffffff',
  surfaceAlt: '#eaf3ed',
  border: '#dcebe1',
  text: '#0f2218',
  muted: '#587265',
  primary: '#1f8a4c',
  primaryDark: '#0d5a30',
  primarySoft: '#e2f4e8',
  primaryText: '#ffffff',
  secondary: '#2563eb',
  secondaryDark: '#1a47a8',
  secondarySoft: '#e3ecff',
  accent: '#f59e0b',
  accentSoft: '#fef3d6',
  danger: '#c2321f',
  dangerSoft: '#fde8e4',
  warning: '#b45309',
  warningSoft: '#fef0d3',
  success: '#0b7a4b',
  successSoft: '#dcf5e8',
  info: '#1d5fd1',
  infoSoft: '#e1ecfd',
};

const dark: typeof light = {
  bg: '#08130d',
  surface: '#0f1c15',
  surfaceAlt: '#16271d',
  border: '#21382b',
  text: '#e6f4ea',
  muted: '#86a595',
  primary: '#4ade80',
  primaryDark: '#0f4a28',
  primarySoft: '#123022',
  primaryText: '#04210f',
  secondary: '#7aa7ff',
  secondaryDark: '#1a2f66',
  secondarySoft: '#15264a',
  accent: '#fbbf24',
  accentSoft: '#3a2c0c',
  danger: '#f97066',
  dangerSoft: '#3d1a16',
  warning: '#fdb022',
  warningSoft: '#3a2c0c',
  success: '#47cd89',
  successSoft: '#12301f',
  info: '#84adff',
  infoSoft: '#15264a',
};

export type Colors = typeof light;

/** Qo'shimcha rang urg'ulari (logotip ranglari): ikonka va kartochkalar rang-barang bo'lishi uchun. */
export type ToneName = 'blue' | 'orange' | 'green' | 'purple' | 'rose' | 'teal';
const toneLight: Record<ToneName, { fg: string; soft: string }> = {
  blue: { fg: '#2563eb', soft: '#e3ecff' },
  orange: { fg: '#ea7a0b', soft: '#fff0dc' },
  green: { fg: '#1f8a4c', soft: '#e2f4e8' },
  purple: { fg: '#7c3aed', soft: '#eee6ff' },
  rose: { fg: '#e0426b', soft: '#ffe6ee' },
  teal: { fg: '#0e9aa7', soft: '#dbf3f5' },
};
const toneDark: Record<ToneName, { fg: string; soft: string }> = {
  blue: { fg: '#7aa7ff', soft: '#15264a' },
  orange: { fg: '#fbab4a', soft: '#3a2410' },
  green: { fg: '#4ade80', soft: '#123022' },
  purple: { fg: '#b69cff', soft: '#271c4a' },
  rose: { fg: '#ff8aa8', soft: '#3d1a26' },
  teal: { fg: '#5fd6e0', soft: '#0f3338' },
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 } as const;

function shadows(isDark: boolean) {
  const base = (opacity: number, r: number, y: number, elevation: number): ViewStyle =>
    isDark
      ? { borderWidth: 1, borderColor: '#21382b' }
      : Platform.select<ViewStyle>({
          android: { elevation },
          default: {
            shadowColor: '#0a2e1a',
            shadowOpacity: opacity,
            shadowRadius: r,
            shadowOffset: { width: 0, height: y },
          },
        }) ?? {};
  return { sm: base(0.06, 6, 2, 1), md: base(0.1, 14, 6, 3), lg: base(0.16, 24, 10, 6) };
}

export function useTheme() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  return { colors: isDark ? dark : light, tones: isDark ? toneDark : toneLight, spacing, radius, shadow: shadows(isDark), isDark };
}
