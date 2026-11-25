import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, View } from 'react-native';
import { PressableScale } from './PressableScale';
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
  const { colors, radius, spacing } = useTheme();
  const inactive = disabled || loading;

  const bg =
    variant === 'primary' ? colors.primary : 'transparent';
  // Dizayn: asosiy — to'q yashil; ikkilamchi — chegarali shaffof; o'chirish — qizil chegara
  const borderColor =
    variant === 'primary' ? colors.primary : variant === 'secondary' ? colors.border : variant === 'danger' ? colors.danger : 'transparent';
  const fg =
    variant === 'primary'
      ? colors.primaryText
      : variant === 'secondary'
        ? colors.text
        : variant === 'danger'
          ? colors.danger
          : colors.muted;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={[
        {
          backgroundColor: bg,
          borderWidth: 1,
          borderColor,
          borderRadius: radius.sm,
          minHeight: 50,
          paddingHorizontal: spacing.lg,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: inactive ? 0.55 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          {icon ? <Ionicons name={icon} size={18} color={fg} /> : null}
          <Text variant="label" style={{ color: fg, fontSize: 15, fontWeight: '600' }}>
            {title}
          </Text>
        </View>
      )}
    </PressableScale>
  );
}
