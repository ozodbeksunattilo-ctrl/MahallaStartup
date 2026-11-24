import { Text as RNText, type TextProps } from 'react-native';
import { Children, type ReactNode } from 'react';
import { tr, useLang } from '@/lib/i18n';
import { useTheme } from '@/theme';

type Variant = 'display' | 'title' | 'heading' | 'body' | 'muted' | 'label' | 'eyebrow';

const sizes: Record<
  Variant,
  { fontSize: number; fontWeight?: '500' | '600' | '700' | '800'; lineHeight: number; letterSpacing?: number; textTransform?: 'uppercase' }
> = {
  display: { fontSize: 30, fontWeight: '800', lineHeight: 36, letterSpacing: -0.5 },
  title: { fontSize: 24, fontWeight: '700', lineHeight: 30, letterSpacing: -0.3 },
  heading: { fontSize: 17, fontWeight: '700', lineHeight: 23, letterSpacing: -0.1 },
  body: { fontSize: 15, lineHeight: 22 },
  muted: { fontSize: 13, lineHeight: 18 },
  label: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  eyebrow: { fontSize: 11, fontWeight: '700', lineHeight: 14, letterSpacing: 1, textTransform: 'uppercase' },
};

function translate(node: ReactNode, lang: Parameters<typeof tr>[1]): ReactNode {
  if (typeof node === 'string') return tr(node, lang);
  if (Array.isArray(node)) return Children.toArray(node).map((c) => (typeof c === 'string' ? tr(c, lang) : c));
  return node;
}

export function Text({ variant = 'body', style, children, raw, ...props }: TextProps & { variant?: Variant; /** Foydalanuvchi matni: tarjima qilinmaydi */ raw?: boolean }) {
  const { colors } = useTheme();
  const { lang } = useLang();
  const color = variant === 'muted' || variant === 'eyebrow' ? colors.muted : colors.text;
  return (
    <RNText {...props} style={[sizes[variant], { color }, style]}>
      {raw ? children : translate(children, lang)}
    </RNText>
  );
}
