import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';
import { Text } from './Text';
import { useTheme, type ToneName } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;

interface ListRowProps {
  title: string;
  subtitle?: string;
  icon?: IconName;
  /** O'ngda ko'rsatiladigan kichik hisoblagich (masalan, o'qilmagan soni) */
  badge?: number;
  onPress?: () => void;
  destructive?: boolean;
  /** Ikonka rang urg'usi */
  tone?: ToneName;
}

export function ListRow({ title, subtitle, icon, badge, onPress, destructive, tone = 'blue' }: ListRowProps) {
  const { colors, tones, spacing, radius } = useTheme();
  const tint = destructive ? colors.danger : tones[tone].fg;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.sm + 2,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      {icon ? (
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: radius.sm,
            backgroundColor: destructive ? colors.dangerSoft : tones[tone].soft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={icon} size={19} color={tint} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text variant="label" style={{ fontSize: 15, color: destructive ? colors.danger : colors.text }}>
          {title}
        </Text>
        {subtitle ? <Text variant="muted">{subtitle}</Text> : null}
      </View>
      {badge ? (
        <View
          style={{
            minWidth: 22,
            height: 22,
            paddingHorizontal: 6,
            borderRadius: 11,
            backgroundColor: colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text variant="label" style={{ color: '#1c1203', fontSize: 12 }}>
            {badge}
          </Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  );
}
