import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Text } from './Text';
import { useTheme } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;

interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
}

export function Button({ title, onPress, variant = 'primary', icon, loading, disabled }: ButtonProps) {
  const { colors, radius, spacing, shadow } = useTheme();
  const inactive = disabled || loading;

  const bg =
    variant === 'primary'
      ? colors.primary
      : variant === 'secondary'
        ? colors.primarySoft
        : variant === 'danger'
          ? colors.dangerSoft
          : 'transparent';
  const fg =
    variant === 'primary'
      ? colors.primaryText
      : variant === 'secondary'
        ? colors.primary
        : variant === 'danger'
          ? colors.danger
          : colors.muted;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        {
          backgroundColor: bg,
          borderRadius: radius.md,
          minHeight: 50,
          paddingHorizontal: spacing.lg,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: inactive ? 0.55 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        variant === 'primary' ? shadow.sm : null,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          {icon ? <Ionicons name={icon} size={18} color={fg} /> : null}
          <Text variant="label" style={{ color: fg, fontSize: 15, fontWeight: '700' }}>
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
