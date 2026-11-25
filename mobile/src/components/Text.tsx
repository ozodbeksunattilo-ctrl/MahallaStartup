import { StyleSheet, Text as RNText, type TextProps, type TextStyle } from 'react-native';
import { Children, type ReactNode } from 'react';
import { tr, useLang } from '@/lib/i18n';
import { fonts, useTheme } from '@/theme';

type Variant = 'display' | 'title' | 'heading' | 'body' | 'muted' | 'label' | 'eyebrow';

// Display/Title/Heading — Lora (serif), qolgani — Onest. Eyebrow: terrakota, oddiy harflar.
const sizes: Record<Variant, TextStyle & { serif?: boolean }> = {
  display: { fontSize: 32, lineHeight: 38, letterSpacing: -1, serif: true },
  title: { fontSize: 25, lineHeight: 31, letterSpacing: -0.6, serif: true },
  heading: { fontSize: 18, lineHeight: 24, letterSpacing: -0.3, serif: true },
  body: { fontSize: 15, lineHeight: 22 },
  muted: { fontSize: 13, lineHeight: 18 },
  label: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  eyebrow: { fontSize: 13, fontWeight: '600', lineHeight: 17 },
};

/** Maxsus shriftda `fontWeight` Android'da ishlamaydi: og'irlik mos oila nomiga aylantiriladi. */
function familyFor(weight: TextStyle['fontWeight'], serif: boolean, italic: boolean): string {
  if (serif) return italic ? fonts.serifItalic : fonts.serif;
  const w = Number(weight === 'bold' ? 700 : weight === 'normal' || weight === undefined ? 400 : weight);
  if (w >= 700) return fonts.bold;
  if (w >= 600) return fonts.semibold;
  if (w >= 500) return fonts.medium;
  return fonts.regular;
}

function translate(node: ReactNode, lang: Parameters<typeof tr>[1]): ReactNode {
  if (typeof node === 'string') return tr(node, lang);
  if (Array.isArray(node)) return Children.toArray(node).map((c) => (typeof c === 'string' ? tr(c, lang) : c));
  return node;
}

export function Text({
  variant = 'body',
  style,
  children,
  raw,
  serif,
  ...props
}: TextProps & {
  variant?: Variant;
  /** Foydalanuvchi matni: tarjima qilinmaydi */
  raw?: boolean;
  /** Lora shriftini majburlash (masalan, katta raqamlar) */
  serif?: boolean;
}) {
  const { colors } = useTheme();
  const { lang } = useLang();
  const { serif: variantSerif, ...base } = sizes[variant];
  const color = variant === 'muted' ? colors.muted : variant === 'eyebrow' ? colors.secondary : colors.text;
  const flat: TextStyle = StyleSheet.flatten([base, { color }, style]) ?? {};
  const { fontWeight, fontStyle, ...rest } = flat;
  const fontFamily = flat.fontFamily ?? familyFor(fontWeight, serif ?? variantSerif ?? false, fontStyle === 'italic');
  return (
    <RNText {...props} style={[rest, { fontFamily }]}>
      {raw ? children : translate(children, lang)}
    </RNText>
  );
}
