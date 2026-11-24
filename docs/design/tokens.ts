// Mahalladosh dizayn tokenlari — mobil (React Native) uchun.
// Veb-panel bilan bir xil qiymatlar: frontend/app/globals.css
// Mobil loyihaga nusxa oling: apps/mobile/src/theme/tokens.ts

export const color = {
  bg: '#F6F3EC',
  surface: '#FFFFFF',
  surface2: '#EFEBE2',
  ink: '#1D2321',
  ink2: '#4A534F',
  muted: '#6B736F',
  line: '#DDD6C8',
  primary: '#0E6B56',
  primaryPressed: '#0A5745',
  primarySoft: '#DCEDE6',
  onPrimary: '#FFFFFF',
  focus: '#1D5FA8',
  danger: '#B42318',
  dangerBg: '#FBE4E1',
} as const;

/** Holat: rang + ikonka (lucide-react-native nomi) + matn. Rang hech qachon yolg'iz ishlatilmaydi. */
export const status = {
  PENDING_REVIEW: { fg: '#55606B', bg: '#E8EBEE', icon: 'Clock', label: 'Moderatsiyada' },
  REJECTED: { fg: '#A8321E', bg: '#F8E3DC', icon: 'PenLine', label: 'Tuzatish kerak' },
  OPEN: { fg: '#1D5FA8', bg: '#E1EBF7', icon: 'CircleDot', label: 'Ochiq' },
  VOTING: { fg: '#8A5A00', bg: '#F9EDCF', icon: 'Vote', label: 'Ovoz berilmoqda' }, // OPEN + inCurrentRound
  SELECTED: { fg: '#6A3FA0', bg: '#EEE5F8', icon: 'Trophy', label: 'Oylik ovozda tanlandi' },
  IN_PROGRESS: { fg: '#0E6B56', bg: '#DCEDE6', icon: 'Wrench', label: 'Jarayonda' },
  REFERRED: { fg: '#9A4A0B', bg: '#F7E6D6', icon: 'Send', label: 'Tashkilotdan javob kutilmoqda' },
  RESOLVED: { fg: '#1F6B2E', bg: '#DFF0E1', icon: 'CheckCircle2', label: 'Hal qilindi' },
} as const;

export const category = {
  ROAD: { label: 'Yo‘l', icon: 'Construction' },
  LIGHTING: { label: 'Yoritish', icon: 'Lightbulb' },
  WASTE: { label: 'Chiqindi', icon: 'Trash2' },
  WATER: { label: 'Suv', icon: 'Droplets' },
  LANDSCAPING: { label: 'Obodonlashtirish', icon: 'Trees' },
  OTHER: { label: 'Boshqa', icon: 'CircleEllipsis' },
} as const;

/** Shrift: Golos Text (@expo-google-fonts/golos-text). O‘zbek ‘ belgisini to‘g‘ri chiqaradi. */
export const font = {
  regular: 'GolosText_400Regular',
  medium: 'GolosText_500Medium',
  semibold: 'GolosText_600SemiBold',
  bold: 'GolosText_700Bold',
} as const;

export const text = {
  display: { fontSize: 28, lineHeight: 34, fontFamily: font.bold },
  h1: { fontSize: 22, lineHeight: 28, fontFamily: font.semibold },
  h2: { fontSize: 18, lineHeight: 24, fontFamily: font.semibold },
  body: { fontSize: 16, lineHeight: 24, fontFamily: font.regular }, // mobilda asosiy matn 16 dan kichik emas
  label: { fontSize: 15, lineHeight: 20, fontFamily: font.semibold },
  small: { fontSize: 13, lineHeight: 18, fontFamily: font.regular },
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 6, md: 10, lg: 14, pill: 999 } as const;

/** Minimal bosish maydoni: 48 dp (asosiy tugmalar 52). */
export const hit = { min: 48, primary: 52 } as const;
