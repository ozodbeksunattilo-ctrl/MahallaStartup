import { Ionicons } from '@expo/vector-icons';
import { useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from './Text';
import { useTheme, type ToneName } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;

export interface SelectOption {
  value: string;
  label: string;
  /** Tarjima qilinmasdan ko'rsatiladi (masalan, til nomi) */
  raw?: boolean;
}

interface SelectProps {
  label?: string;
  options: SelectOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  /** `true` bo'lsa «Hammasi» varianti chiqadi va `null` qaytadi */
  allowAll?: boolean;
  placeholder?: string;
  icon?: IconName;
  /** Ikonka rangi */
  iconTone?: ToneName;
  /** `dark` — gradient ustida (kirish ekrani) */
  tone?: 'default' | 'dark';
  /** O'zgacha tugma (masalan, kichik til tugmasi) */
  trigger?: (open: () => void, current: SelectOption | undefined) => ReactNode;
}

/** Ochiladigan ro'yxat (select): maydon ko'rinishidagi tugma + pastdan chiqadigan varaq. */
export function Select({
  label,
  options,
  value,
  onChange,
  allowAll = false,
  placeholder = 'Tanlang',
  icon,
  iconTone = 'blue',
  tone = 'default',
  trigger,
}: SelectProps) {
  const { colors, tones, radius, spacing, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const items: SelectOption[] = allowAll ? [{ value: '', label: 'Hammasi' }, ...options] : options;
  const current = items.find((o) => o.value === (value ?? ''));
  const dark = tone === 'dark';

  return (
    <View style={{ gap: spacing.xs }}>
      {label ? <Text variant="label">{label}</Text> : null}
      {trigger ? (
        trigger(() => setOpen(true), current)
      ) : (
      <Pressable
        accessibilityRole="combobox"
        accessibilityLabel={label}
        onPress={() => setOpen(true)}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          minHeight: dark ? 42 : 50,
          paddingHorizontal: spacing.md,
          borderRadius: dark ? radius.pill : radius.md,
          borderWidth: dark ? 0 : 1,
          borderColor: colors.border,
          backgroundColor: dark ? 'rgba(255,255,255,0.2)' : colors.surface,
          opacity: pressed ? 0.85 : 1,
        })}
      >
        {icon ? <Ionicons name={icon} size={20} color={dark ? '#fff' : tones[iconTone].fg} /> : null}
        <Text
          raw={current?.raw}
          style={{ flex: 1, color: dark ? '#fff' : current ? colors.text : colors.muted, fontWeight: dark ? '700' : '500' }}
          numberOfLines={1}
        >
          {current ? current.label : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={dark ? '#fff' : colors.muted} />
      </Pressable>
      )}

      <Modal visible={open} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setOpen(false)}>
        <View
          style={{ flex: 1, backgroundColor: 'rgba(8,20,14,0.5)', justifyContent: 'flex-end' }}
        >
          <Pressable style={{ flex: 1 }} onPress={() => setOpen(false)} accessibilityLabel="Yopish" />
          <View
            style={[
              {
                backgroundColor: colors.surface,
                borderTopLeftRadius: radius.xl,
                borderTopRightRadius: radius.xl,
                paddingTop: spacing.md,
                paddingBottom: insets.bottom + spacing.lg,
                maxHeight: '70%',
              },
              shadow.lg,
            ]}
          >
            <View
              style={{
                alignSelf: 'center',
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: colors.border,
                marginBottom: spacing.md,
              }}
            />
            {label ? (
              <Text variant="heading" style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
                {label}
              </Text>
            ) : null}
            <ScrollView>
              {items.map((o) => {
                const active = o.value === (value ?? '');
                return (
                  <Pressable
                    key={o.value || 'all'}
                    accessibilityRole="menuitem"
                    accessibilityState={{ selected: active }}
                    onPress={() => {
                      onChange(o.value === '' ? null : o.value);
                      setOpen(false);
                    }}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingHorizontal: spacing.lg,
                      paddingVertical: 14,
                      backgroundColor: active ? colors.primarySoft : pressed ? colors.surfaceAlt : 'transparent',
                    })}
                  >
                    <Text
                      raw={o.raw}
                      style={{ fontSize: 16, fontWeight: active ? '700' : '500', color: active ? colors.primary : colors.text }}
                    >
                      {o.label}
                    </Text>
                    {active ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
