import { Pressable, ScrollView } from 'react-native';
import { Text } from './Text';
import { useTheme } from '@/theme';

interface ChipsProps {
  options: Array<{ value: string; label: string }>;
  value: string | null;
  onChange: (value: string | null) => void;
  /** `true` bo'lsa «Hammasi» chip'i ham chiqadi va `null` qaytadi */
  allowAll?: boolean;
}

export function Chips({ options, value, onChange, allowAll = true }: ChipsProps) {
  const { colors, radius, spacing, shadow } = useTheme();
  const items = allowAll ? [{ value: '', label: 'Hammasi' }, ...options] : options;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: spacing.sm, paddingVertical: 4, paddingHorizontal: 2 }}
    >
      {items.map((item) => {
        const active = (value ?? '') === item.value;
        return (
          <Pressable
            key={item.value || 'all'}
            onPress={() => onChange(item.value === '' ? null : item.value)}
            style={[
              {
                paddingHorizontal: spacing.md,
                paddingVertical: 7,
                borderRadius: radius.pill,
                backgroundColor: active ? colors.primary : colors.surface,
              },
              active ? shadow.sm : null,
            ]}
          >
            <Text variant="label" style={{ color: active ? colors.primaryText : colors.muted }}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
