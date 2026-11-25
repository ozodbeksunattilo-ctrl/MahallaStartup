import { Ionicons } from '@expo/vector-icons';
import { useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from './Text';
import { haptic } from '@/lib/haptics';
import { useLang } from '@/lib/i18n';
import { fonts, useTheme, type ToneName } from '@/theme';

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
  /** Ro'yxat tepasida qidiruv maydoni (uzun ro'yxatlar uchun) */
  searchable?: boolean;
  error?: string | null;
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
  iconTone: _iconTone = 'blue',
  tone = 'default',
  trigger,
  searchable = false,
  error,
}: SelectProps) {
  const { t } = useLang();
  const [query, setQuery] = useState('');
  const { colors, radius, spacing, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const items: SelectOption[] = allowAll ? [{ value: '', label: 'Hammasi' }, ...options] : options;
  const current = items.find((o) => o.value === (value ?? ''));
  const q = query.trim().toLowerCase();
  const shown = q ? items.filter((o) => o.label.toLowerCase().includes(q)) : items;
  const close = () => {
    setOpen(false);
    setQuery('');
  };
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
          borderWidth: dark ? 0 : error ? 2 : 1,
          borderColor: error ? colors.danger : colors.border,
          backgroundColor: dark ? 'rgba(255,255,255,0.2)' : colors.surface,
          opacity: pressed ? 0.85 : 1,
        })}
      >
        {icon ? <Ionicons name={icon} size={20} color={dark ? '#fff' : colors.muted} /> : null}
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

      {error ? (
        <Text variant="muted" style={{ color: colors.danger }}>
          {error}
        </Text>
      ) : null}

      <Modal visible={open} transparent animationType={searchable ? 'fade' : 'slide'} statusBarTranslucent onRequestClose={close}>
        <View
          style={{ flex: 1, backgroundColor: 'rgba(8,20,14,0.5)', justifyContent: 'flex-end' }}
        >
          {/* Qidiruvli ro'yxat tepadan ochiladi: klaviatura pastda chiqib, uni yopib qo'ymaydi */}
          <Pressable style={{ flex: 1 }} onPress={close} accessibilityLabel={t('Yopish')} />
          <View
            style={[
              searchable
                ? {
                    position: 'absolute',
                    top: insets.top + spacing.xl,
                    left: spacing.md,
                    right: spacing.md,
                    borderRadius: radius.xl,
                    paddingBottom: spacing.md,
                    maxHeight: '55%',
                  }
                : {
                    borderTopLeftRadius: radius.xl,
                    borderTopRightRadius: radius.xl,
                    paddingBottom: insets.bottom + spacing.lg,
                    maxHeight: '70%',
                  },
              { backgroundColor: colors.surface, paddingTop: spacing.md },
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
            {searchable ? (
              <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.sm,
                    paddingHorizontal: spacing.md,
                    borderRadius: radius.md,
                    backgroundColor: colors.surfaceAlt,
                  }}
                >
                  <Ionicons name="search" size={18} color={colors.muted} />
                  <TextInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder={t('Qidirish…')}
                    placeholderTextColor={colors.muted}
                    autoCorrect={false}
                    style={{ flex: 1, minHeight: 44, color: colors.text, fontSize: 15, fontFamily: fonts.regular }}
                  />
                </View>
              </View>
            ) : null}
            <ScrollView keyboardShouldPersistTaps="handled">
              {shown.length === 0 ? (
                <Text variant="muted" style={{ textAlign: 'center', padding: spacing.lg }}>
                  {"Ma'lumot topilmadi"}
                </Text>
              ) : null}
              {shown.map((o) => {
                const active = o.value === (value ?? '');
                return (
                  <Pressable
                    key={o.value || 'all'}
                    accessibilityRole="menuitem"
                    accessibilityState={{ selected: active }}
                    onPress={() => {
                      haptic.tap();
                      onChange(o.value === '' ? null : o.value);
                      close();
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
