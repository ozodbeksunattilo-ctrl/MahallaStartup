import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { MediaGrid } from '@/components/MediaGrid';
import { Screen } from '@/components/Screen';
import { AsyncView } from '@/components/StateView';
import { StatusBadge } from '@/components/StatusBadge';
import { Text } from '@/components/Text';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { errorMessage, useFetch } from '@/lib/hooks';
import { EVENT_STATUS } from '@/lib/labels';
import type { EventDetail } from '@/lib/types';
import { useTheme } from '@/theme';

// API: GET /events/:id · PUT/DELETE /events/:id/rsvp
export default function EventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const ev = useFetch<EventDetail>(`/events/${id}`);
  const [now] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle(e: EventDetail) {
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ going: boolean; rsvpCount: number }>(`/events/${e.id}/rsvp`, {
        method: e.myRsvp ? 'DELETE' : 'PUT',
      });
      const going = res ? res.going : !e.myRsvp;
      const count = res ? res.rsvpCount : Math.max(0, e.rsvpCount - 1);
      ev.setData((p) => (p ? { ...p, myRsvp: going, rsvpCount: count } : p));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen onRefresh={() => void ev.refresh()} refreshing={ev.refreshing}>
      <AsyncView data={ev.data} loading={ev.loading} error={ev.error} onRetry={ev.reload}>
        {(e) => {
          const open = e.status === 'PUBLISHED' && new Date(e.startsAt).getTime() > now;
          return (
            <>
              <Text variant="title" raw>
                {e.title}
              </Text>
              <StatusBadge status={e.status} label={EVENT_STATUS[e.status] ?? e.status} />
              {e.status === 'CANCELLED' ? (
                <Text style={{ color: colors.danger }}>Bu tadbir bekor qilingan.</Text>
              ) : null}

              <Card>
                <View style={{ gap: 6 }}>
                  <Text>
                    <Ionicons name="calendar-outline" size={15} color={colors.muted} /> {formatDateTime(e.startsAt)}
                    {e.endsAt ? ` — ${formatDateTime(e.endsAt)}` : ''}
                  </Text>
                  <Text>
                    <Ionicons name="location-outline" size={15} color={colors.muted} /> {e.location}
                  </Text>
                  <Text>
                    <Ionicons name="person-outline" size={15} color={colors.muted} /> {e.organizer}
                  </Text>
                  <Text variant="muted">{e.rsvpCount} kishi qatnashadi</Text>
                </View>
              </Card>

              <Text raw>{e.description}</Text>

              {e.resultText ? (
                <Card title="Tadbir natijasi">
                  <Text raw>{e.resultText}</Text>
                  <MediaGrid media={e.media} />
                </Card>
              ) : null}

              {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
              {open ? (
                <Button
                  title={e.myRsvp ? 'Qatnashasiz — bekor qilish' : 'Qatnashaman'}
                  variant={e.myRsvp ? 'secondary' : 'primary'}
                  loading={busy}
                  onPress={() => void toggle(e)}
                />
              ) : null}
            </>
          );
        }}
      </AsyncView>
    </Screen>
  );
}
