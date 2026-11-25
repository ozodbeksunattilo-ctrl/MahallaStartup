import type { ReactNode } from 'react';
import { RefreshControl, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';

interface ScreenProps {
  children: ReactNode;
  /** `false` bo'lsa ScrollView ishlatilmaydi (masalan, chat yoki FlatList uchun) */
  scroll?: boolean;
  edges?: Edge[];
  /** Kontent tepasida, padding'siz to'liq kenglikda chiqadigan blok (masalan, `Hero`) */
  header?: ReactNode;
  /** Kontentdan keyin, ekran pastiga yopishib turadigan blok (masalan, izoh yozish paneli) */
  footer?: ReactNode;
  /** Berilsa — pastga tortib yangilash (pull-to-refresh) */
  onRefresh?: () => void;
  refreshing?: boolean;
}

/**
 * Ekran qobig'i. Kiritish maydoni bosilganda ScrollView o'zi maydonni klaviatura ustiga suradi
 * (react-native-keyboard-controller: Android edge-to-edge'da ham ishlaydi).
 */
export function Screen({
  children,
  scroll = true,
  edges = ['left', 'right', 'bottom'],
  header,
  footer,
  onRefresh,
  refreshing = false,
}: ScreenProps) {
  const { colors, spacing } = useTheme();
  const body = <View style={{ padding: spacing.lg, gap: spacing.md, flexGrow: 1 }}>{children}</View>;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={footer ? edges.filter((e) => e !== 'bottom') : edges}>
      {scroll ? (
        <KeyboardAwareScrollView
          bottomOffset={spacing.xl}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: spacing.xl }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
            ) : undefined
          }
        >
          {header}
          {body}
        </KeyboardAwareScrollView>
      ) : (
        <View style={{ flex: 1 }}>{children}</View>
      )}
      {footer}
    </SafeAreaView>
  );
}
