import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text } from 'react-native';
import { Select } from './Select';
import { LANGS, useLang, type Lang } from '@/lib/i18n';
import { fonts, useTheme } from '@/theme';

const SHORT: Record<Lang, string> = { uz: "O'Z", oz: 'ЎЗ', ru: 'РУ', en: 'EN' };

/** Til tanlagich (select). `compact` — burchakka qo'yiladigan kichik tugma (globus + qisqa nom). */
export function LangSwitch({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useLang();
  const { colors, radius } = useTheme();
  return (
    <Select
      label="Til"
      icon="language"
      iconTone="blue"
      options={LANGS.map((l) => ({ value: l.code, label: l.label, raw: true }))}
      value={lang}
      onChange={(v) => v && setLang(v as Lang)}
      trigger={
        compact
          ? (open) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Til"
                onPress={open}
                hitSlop={8}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  paddingHorizontal: 11,
                  paddingVertical: 7,
                  borderRadius: radius.pill,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Ionicons name="globe-outline" size={16} color={colors.text} />
                <Text style={{ fontSize: 13, fontFamily: fonts.semibold, color: colors.text }}>{SHORT[lang]}</Text>
                <Ionicons name="chevron-down" size={13} color={colors.muted} />
              </Pressable>
            )
          : undefined
      }
    />
  );
}
