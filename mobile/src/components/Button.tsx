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
  const { colors, radius, spacing } = useTheme();
  const inactive = disabled || loading;

  // primary: solid green; secondary: outlined; danger: outlined red; ghost: text only
  const bg = variant === 'primary' ? colors.primary : 'transparent';
  const border = variant === 'primary' ? colors.primary : variant === 'danger' ? colors.danger : variant === 'secondary' ? colors.border : 'transparent';
  const fg = variant === 'primary' ? colors.primaryText : variant === 'danger' ? colors.danger : variant === 'ghost' ? colors.muted : colors.text;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: pressed && variant !== 'primary' ? colors.surfaceAlt : bg,
        borderWidth: 1,
        borderColor: border,
        borderRadius: radius.sm,
        minHeight: 50,
        paddingHorizontal: spacing.lg,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: inactive ? 0.55 : pressed && variant === 'primary' ? 0.88 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
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
    </Pressable>
  );
}
