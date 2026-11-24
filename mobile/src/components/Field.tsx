import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';
import { Text } from './Text';
import { useLang } from '@/lib/i18n';
import { useTheme, type ToneName } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;

interface FieldProps extends TextInputProps {
  label: string;
  hint?: string;
  error?: string | null;
  /** Chap tomondagi ikonka */
  icon?: IconName;
  /** Ikonka rangi */
  iconTone?: ToneName;
}

export function Field({ label, hint, error, icon, iconTone = 'blue', multiline, secureTextEntry, style, ...props }: FieldProps) {
  const { colors, tones, radius, spacing } = useTheme();
  const { t } = useLang();
  const [focused, setFocused] = useState(false);
  // Parol maydonlarida «ko'z» tugmasi: parolni ko'rsatish / yashirish
  const [hidden, setHidden] = useState(true);
  const isSecret = secureTextEntry === true;

  return (
    <View style={{ gap: spacing.xs }}>
      <Text variant="label">{label}</Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: multiline ? 'flex-start' : 'center',
          backgroundColor: colors.surface,
          borderColor: error ? colors.danger : focused ? colors.primary : colors.border,
          borderWidth: focused || error ? 2 : 1,
          borderRadius: radius.md,
          paddingHorizontal: spacing.md,
          gap: spacing.sm,
        }}
      >
        {icon ? (
          <Ionicons
            name={icon}
            size={20}
            color={tones[iconTone].fg}
            style={{ marginTop: multiline ? 14 : 0 }}
          />
        ) : null}
        <TextInput
          placeholderTextColor={colors.muted}
          multiline={multiline}
          {...props}
          placeholder={props.placeholder ? t(props.placeholder) : undefined}
          secureTextEntry={isSecret && hidden}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          style={[
            {
              flex: 1,
              paddingVertical: spacing.md,
              color: colors.text,
              fontSize: 16,
              minHeight: multiline ? 96 : 50,
              textAlignVertical: multiline ? 'top' : 'center',
            },
            style,
          ]}
        />
        {isSecret ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Parolni ko‘rsatish' : 'Parolni yashirish'}
            hitSlop={10}
            onPress={() => setHidden((v) => !v)}
          >
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={22} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text variant="muted" style={{ color: colors.danger }}>
          {error}
        </Text>
      ) : hint ? (
        <Text variant="muted">{hint}</Text>
      ) : null}
    </View>
  );
}
