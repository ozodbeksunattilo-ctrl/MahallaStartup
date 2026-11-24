import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { AsyncView } from '@/components/StateView';
import { Text } from '@/components/Text';
import { formatDate } from '@/lib/format';
import { useFetch } from '@/lib/hooks';
import type { RoundResult } from '@/lib/types';

// API: GET /rounds/:id/result
export default function RoundResultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const result = useFetch<RoundResult>(`/rounds/${id}/result`);

  return (
    <Screen onRefresh={() => void result.refresh()} refreshing={result.refreshing}>
      <AsyncView data={result.data} loading={result.loading} error={result.error} onRetry={result.reload}>
        {(r) => (
          <>
            <Text variant="muted">
              {formatDate(r.periodStart)} — {formatDate(r.periodEnd)}
            </Text>
            <Card title={r.winner ? "G'olib muammo" : 'Natija'}>
              <Text variant="heading">{r.message}</Text>
              {r.winner ? (
                <Button
                  title="Muammoni ochish"
                  onPress={() => router.push(`/issues/${r.winner?.issueId}`)}
                />
              ) : null}
            </Card>
            <Card title="Qatnashish">
              <Text>Ovoz bergan aholi: {r.totalVoters}</Text>
              <Text>Jami ovozlar: {r.totalVotes}</Text>
            </Card>
            {r.ranking.length > 0 ? (
              <Card title="Reyting">
                {r.ranking.map((x) => (
                  <View key={x.issueId} style={{ flexDirection: 'row', gap: 10, paddingVertical: 4 }}>
                    <Text variant="label" style={{ width: 24 }}>
                      {x.rank}.
                    </Text>
                    <Text style={{ flex: 1 }} onPress={() => router.push(`/issues/${x.issueId}`)}>
                      {x.title}
                    </Text>
                    <Text variant="label">{x.votes} ovoz</Text>
                  </View>
                ))}
              </Card>
            ) : null}
          </>
        )}
      </AsyncView>
    </Screen>
  );
}
