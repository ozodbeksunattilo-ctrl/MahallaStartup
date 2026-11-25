import { Platform, type ViewStyle } from 'react-native';

// Dizayn: «Qog'oz, yashil va terrakota» — landing, admin va ilova uchun bitta tizim.
// Kartalar tekis (1px chegara), soya faqat suzuvchi tugma va oynalarda; gradient va rang-barang ikonkalar yo'q.
const light = {
  bg: '#f7f4ea',
  surface: '#fffcf5',
  surfaceAlt: '#eeeadd',
  border: '#d6d6c6',
  text: '#253229',
  muted: '#525c4f',
  primary: '#253a2d',
  primaryDark: '#283c2f',
  primarySoft: '#e3e6d8',
  primaryText: '#fbf6eb',
  /** Hero ustidagi ikkilamchi matn */
  onHeroMuted: '#dedfd3',
  secondary: '#9d4229',
  secondaryDark: '#7e3420',
  secondarySoft: '#f5e3d6',
  accent: '#e0a458',
  accentSoft: '#f3e7cf',
  danger: '#a3302a',
  dangerSoft: '#f5e1dc',
  warning: '#8a5a12',
  warningSoft: '#f3e7cf',
  success: '#3d6b36',
  successSoft: '#e1ead9',
  info: '#3a5f8f',
  infoSoft: '#e1e8f1',
};

const dark: typeof light = {
  bg: '#141a16',
  surface: '#1c241f',
  surfaceAlt: '#252f28',
  border: '#34403a',
  text: '#ece8dc',
  muted: '#a3ab9d',
  primary: '#c9d6bf',
  primaryDark: '#1f2e24',
  primarySoft: '#2b3a30',
  primaryText: '#16201a',
  onHeroMuted: '#c4c8b8',
  secondary: '#e08a6c',
  secondaryDark: '#9d4229',
  secondarySoft: '#3a2620',
  accent: '#e0a458',
  accentSoft: '#3a2e1a',
  danger: '#ec8a80',
  dangerSoft: '#3d2220',
  warning: '#e0b35f',
  warningSoft: '#3a2e1a',
  success: '#9cc78f',
  successSoft: '#22321f',
  info: '#9ab6dc',
  infoSoft: '#1f2a38',
};

export type Colors = typeof light;

/** Holat va ikonka urg'ulari — dizayndagi bosiq, yerga yaqin ranglar. */
export type ToneName = 'blue' | 'orange' | 'green' | 'purple' | 'rose' | 'teal';
const toneLight: Record<ToneName, { fg: string; soft: string }> = {
  blue: { fg: '#3a5f8f', soft: '#e1e8f1' },
  orange: { fg: '#8a5a12', soft: '#f3e7cf' },
  green: { fg: '#3d6b36', soft: '#e1ead9' },
  purple: { fg: '#9d4229', soft: '#f5e3d6' },
  rose: { fg: '#a3302a', soft: '#f5e1dc' },
  teal: { fg: '#2f6b63', soft: '#dcebe8' },
};
const toneDark: Record<ToneName, { fg: string; soft: string }> = {
  blue: { fg: '#9ab6dc', soft: '#1f2a38' },
  orange: { fg: '#e0b35f', soft: '#3a2e1a' },
  green: { fg: '#9cc78f', soft: '#22321f' },
  purple: { fg: '#e08a6c', soft: '#3a2620' },
  rose: { fg: '#ec8a80', soft: '#3d2220' },
  teal: { fg: '#8fcfc4', soft: '#1c3330' },
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 6, md: 8, lg: 12, xl: 16, pill: 999 } as const;

export const fonts = {
  serif: 'Lora_500Medium',
  serifItalic: 'Lora_500Medium_Italic',
  regular: 'Onest_400Regular',
  medium: 'Onest_500Medium',
  semibold: 'Onest_600SemiBold',
  bold: 'Onest_700Bold',
} as const;

function shadows(c: Colors) {
  // Kartalar: soya o'rniga 1px chegara. `lg` — faqat suzuvchi tugma va oynalar uchun haqiqiy soya.
  const flat: ViewStyle = { borderWidth: 1, borderColor: c.border };
  const float: ViewStyle =
    Platform.select<ViewStyle>({
      android: { elevation: 6 },
      default: { shadowColor: '#141c16', shadowOpacity: 0.16, shadowRadius: 20, shadowOffset: { width: 0, height: 8 } },
    }) ?? {};
  return { sm: flat, md: flat, lg: float };
}

// Dizaynda faqat yorug' (qog'oz) uslub bor: telefon tungi rejimda bo'lsa ham ranglar maketdagidek qoladi
// (aks holda yashil hero ustidagi matn ko'rinmay qolardi). `dark` palitra keyinchalik kerak bo'lsa saqlangan.
const FORCE_LIGHT = true;

export function useTheme() {
  const isDark = !FORCE_LIGHT;
  const colors = isDark ? dark : light;
  return { colors, tones: isDark ? toneDark : toneLight, spacing, radius, fonts, shadow: shadows(colors), isDark };
}
