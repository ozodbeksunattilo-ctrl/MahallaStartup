import type { ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Button } from './Button';
import { Text } from './Text';
import { useTheme } from '@/theme';

export function Loading({ label = 'Yuklanmoqda…' }: { label?: string }) {
  const { colors, spacing } = useTheme();
  return (
    <View
      accessibilityRole="progressbar"
      style={{ alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl * 2 }}
    >
      <ActivityIndicator color={colors.primary} />
      <Text variant="muted">{label}</Text>
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { spacing } = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl * 1.5 }}>
      <Text variant="heading">Yuklab bo&apos;lmadi</Text>
      <Text variant="muted" style={{ textAlign: 'center' }}>
        {message}
      </Text>
      {onRetry ? <Button title="Qayta urinish" onPress={onRetry} /> : null}
    </View>
  );
}

interface AsyncViewProps<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  children: (data: T) => ReactNode;
}

/** Yuklanish / xato / qayta urinish holatlarini bir joyda hal qiladi (TZ 6-bo'lim). */
export function AsyncView<T>({ data, loading, error, onRetry, children }: AsyncViewProps<T>) {
  if (data !== null) return <>{children(data)}</>;
  if (loading) return <Loading />;
  return <ErrorState message={error ?? "Ma'lumot topilmadi"} onRetry={onRetry} />;
}
