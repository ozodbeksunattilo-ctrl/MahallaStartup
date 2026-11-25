import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import { Text } from './Text';
import { useTheme } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;

interface CardProps {
  title?: string;
  /** Icon beside the title */
  icon?: IconName;
  /** `soft` — tinted background */
  tone?: 'default' | 'soft';
  children: ReactNode;
  style?: ViewStyle;
}

export function Card({ title, icon, tone = 'default', children, style }: CardProps) {
  const { colors, spacing, radius } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: tone === 'soft' ? colors.surfaceAlt : colors.surface,
          borderWidth: 1,
          borderColor: tone === 'soft' ? colors.surfaceAlt : colors.border,
          borderRadius: radius.md,
          padding: spacing.lg,
          gap: spacing.sm,
        },
        style,
      ]}
    >
      {title ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          {icon ? <Ionicons name={icon} size={16} color={colors.secondary} /> : null}
          <Text variant="eyebrow">{title}</Text>
        </View>
      ) : null}
      {children}
    </View>
  );
}
