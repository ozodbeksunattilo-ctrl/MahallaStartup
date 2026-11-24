import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';

interface ScreenProps {
  children: ReactNode;
  /** `false` bo'lsa ScrollView ishlatilmaydi (masalan, chat yoki FlatList uchun) */
  scroll?: boolean;
  edges?: Edge[];
  /** Kontent tepasida, padding'siz to'liq kenglikda chiqadigan blok (masalan, `Hero`) */
  header?: ReactNode;
  /** Berilsa — pastga tortib yangilash (pull-to-refresh) */
  onRefresh?: () => void;
  refreshing?: boolean;
}

export function Screen({
  children,
  scroll = true,
  edges = ['left', 'right', 'bottom'],
  header,
  onRefresh,
  refreshing = false,
}: ScreenProps) {
  const { colors, spacing } = useTheme();
  const body = (
    <View style={{ padding: spacing.lg, gap: spacing.md, flexGrow: 1 }}>{children}</View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={edges}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: spacing.xl }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
            ) : undefined
          }
        >
          {header}
          {body}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>{children}</View>
      )}
    </SafeAreaView>
  );
}
