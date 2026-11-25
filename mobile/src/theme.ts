import { Platform, useColorScheme, type ViewStyle } from 'react-native';

// Same paper / green / terracotta system as the landing and the admin panel
const light = {
  bg: '#f7f4ea',
  surface: '#fffcf5',
  surfaceAlt: '#eeeadd',
  border: '#d6d6c6',
  text: '#253229',
  muted: '#525c4f',
  primary: '#253a2d',
  primaryDark: '#1a2a20',
  primarySoft: '#e3e6d8',
  primaryText: '#fbf6eb',
  secondary: '#9d4229',
  secondaryDark: '#7a321e',
  secondarySoft: '#f5e3d6',
  accent: '#e0a458',
  accentSoft: '#f6e7cf',
  danger: '#a3302a',
  dangerSoft: '#f5e1dc',
  warning: '#8a5a12',
  warningSoft: '#f3e7cf',
  success: '#3d6b36',
  successSoft: '#e1ead9',
  info: '#3a5f8f',
  infoSoft: '#e1e8f1',
  /** Deep green band (screen headers), the same in both themes, like the landing's voting section */
  hero: '#283c2f',
  heroText: '#fbf6eb',
  heroMuted: '#dedfd3',
  /** Behind the navy logo: nothing on paper, a light tile on dark */
  logoTile: 'transparent',
};

const dark: typeof light = {
  bg: '#1e2820',
  surface: '#263329',
  surfaceAlt: '#303c31',
  border: '#4a594c',
  text: '#f2eee0',
  muted: '#cccfc2',
  primary: '#adc0a5',
  primaryDark: '#223025',
  primarySoft: '#33443a',
  primaryText: '#223025',
  secondary: '#efa785',
  secondaryDark: '#c97e5d',
  secondarySoft: '#4a3328',
  accent: '#e8b36a',
  accentSoft: '#43361f',
  danger: '#f19a8c',
  dangerSoft: '#4a2723',
  warning: '#e2b46a',
  warningSoft: '#43361f',
  success: '#a9cf9c',
  successSoft: '#2f4330',
  info: '#9fbbe0',
  infoSoft: '#2c3a4c',
  hero: '#16201a',
  heroText: '#fbf6eb',
  heroMuted: '#cccfc2',
  logoTile: '#f2eee0',
};

export type Colors = typeof light;

/** Extra accent hues for icons; earthy so they sit with the rest of the palette. */
export type ToneName = 'blue' | 'orange' | 'green' | 'purple' | 'rose' | 'teal';
const toneLight: Record<ToneName, { fg: string; soft: string }> = {
  blue: { fg: '#3a5f8f', soft: '#e1e8f1' },
  orange: { fg: '#9d4229', soft: '#f5e3d6' },
  green: { fg: '#3d6b36', soft: '#e1ead9' },
  purple: { fg: '#6d4f8c', soft: '#ebe4f1' },
  rose: { fg: '#a3485f', soft: '#f4e1e6' },
  teal: { fg: '#2b6e66', soft: '#dcebe8' },
};
const toneDark: Record<ToneName, { fg: string; soft: string }> = {
  blue: { fg: '#9fbbe0', soft: '#2c3a4c' },
  orange: { fg: '#efa785', soft: '#4a3328' },
  green: { fg: '#a9cf9c', soft: '#2f4330' },
  purple: { fg: '#c3abde', soft: '#3a3048' },
  rose: { fg: '#eaa0b2', soft: '#4a2b33' },
  teal: { fg: '#93cfc6', soft: '#26403c' },
};

/** Font family names registered in app/_layout.tsx (Lora for headings, Onest for text). */
export const fonts = {
  serif: 'Lora_500Medium',
  serifItalic: 'Lora_500Medium_Italic',
  regular: 'Onest_400Regular',
  medium: 'Onest_500Medium',
  semibold: 'Onest_600SemiBold',
  bold: 'Onest_700Bold',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 6, md: 8, lg: 12, xl: 16, pill: 999 } as const;

// Flat surfaces with a hairline border; only floating layers (sheets, the add button) get a shadow
function shadows(c: Colors, isDark: boolean) {
  const line: ViewStyle = { borderWidth: 1, borderColor: c.border };
  const float: ViewStyle = isDark
    ? line
    : (Platform.select<ViewStyle>({
        android: { elevation: 6 },
        default: { shadowColor: '#141c16', shadowOpacity: 0.16, shadowRadius: 20, shadowOffset: { width: 0, height: 8 } },
      }) ?? {});
  return { sm: line, md: line, lg: float };
}

export function useTheme() {
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? dark : light;
  return { colors, tones: isDark ? toneDark : toneLight, spacing, radius, shadow: shadows(colors, isDark), fonts, isDark };
}
