import { useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/Screen';
import { AsyncView } from '@/components/StateView';
import { Text } from '@/components/Text';
import { formatDateTime } from '@/lib/format';
import { useFetch } from '@/lib/hooks';
import type { Announcement } from '@/lib/types';
import { useTheme } from '@/theme';

// API: GET /announcements/:id
export default function AnnouncementScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const item = useFetch<Announcement>(`/announcements/${id}`);

  return (
    <Screen onRefresh={() => void item.refresh()} refreshing={item.refreshing}>
      <AsyncView data={item.data} loading={item.loading} error={item.error} onRetry={item.reload}>
        {(a) => (
          <>
            {a.isImportant ? (
              <Text variant="label" style={{ color: colors.warning }}>
                MUHIM E&apos;LON
              </Text>
            ) : null}
            <Text variant="title" raw>
              {a.title}
            </Text>
            <Text variant="muted">{formatDateTime(a.publishedAt ?? a.createdAt)}</Text>
            {/* Oddiy matn sifatida ko'rsatiladi (TZ 8-bo'lim): HTML sharhlanmaydi */}
            <Text raw>{a.body}</Text>
          </>
        )}
      </AsyncView>
    </Screen>
  );
}
