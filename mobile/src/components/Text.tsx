import { StyleSheet, Text as RNText, type TextProps, type TextStyle } from 'react-native';
import { Children, type ReactNode } from 'react';
import { tr, useLang } from '@/lib/i18n';
import { fonts, useTheme } from '@/theme';

type Variant = 'display' | 'title' | 'heading' | 'body' | 'muted' | 'label' | 'eyebrow';

// Headings in Lora, text in Onest — the landing's pairing
const sizes: Record<Variant, TextStyle> = {
  display: { fontFamily: fonts.serif, fontSize: 32, lineHeight: 38, letterSpacing: -1 },
  title: { fontFamily: fonts.serif, fontSize: 25, lineHeight: 31, letterSpacing: -0.6 },
  heading: { fontFamily: fonts.serif, fontSize: 18, lineHeight: 24, letterSpacing: -0.3 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  muted: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  label: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18 },
  eyebrow: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 17 },
};

const SERIF = new Set<Variant>(['display', 'title', 'heading']);

// Custom fonts ship one file per weight, so a fontWeight override picks the matching Onest file
function familyFor(weight: TextStyle['fontWeight']): string {
  if (weight === '700' || weight === '800' || weight === '900' || weight === 'bold') return fonts.bold;
  if (weight === '600') return fonts.semibold;
  if (weight === '500') return fonts.medium;
  return fonts.regular;
}

function translate(node: ReactNode, lang: Parameters<typeof tr>[1]): ReactNode {
  if (typeof node === 'string') return tr(node, lang);
  if (Array.isArray(node)) return Children.toArray(node).map((c) => (typeof c === 'string' ? tr(c, lang) : c));
  return node;
}

export function Text({ variant = 'body', style, children, raw, ...props }: TextProps & { variant?: Variant; /** User text: not translated */ raw?: boolean }) {
  const { colors } = useTheme();
  const { lang } = useLang();
  const color = variant === 'muted' ? colors.muted : variant === 'eyebrow' ? colors.secondary : colors.text;
  const { fontWeight, fontStyle, ...rest } = StyleSheet.flatten(style) ?? {};
  const serif = SERIF.has(variant);
  // Italic is its own font file too
  const family = serif ? (fontStyle === 'italic' ? fonts.serifItalic : fonts.serif) : fontWeight ? familyFor(fontWeight) : undefined;
  const keepStyle = !serif && fontStyle ? { fontStyle } : null;
  return (
    <RNText {...props} style={[sizes[variant], { color }, rest, keepStyle, family ? { fontFamily: family } : null]}>
      {raw ? children : translate(children, lang)}
    </RNText>
  );
}
