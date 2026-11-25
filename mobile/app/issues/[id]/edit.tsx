import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert } from 'react-native';
import { IssueForm } from '@/components/IssueForm';
import { Screen } from '@/components/Screen';
import { AsyncView } from '@/components/StateView';
import { Text } from '@/components/Text';
import { api } from '@/lib/api';
import { useFetch } from '@/lib/hooks';
import type { IssueDetail } from '@/lib/types';

// API: PATCH /issues/:id (PENDING_REVIEW / REJECTED) -> rad etilgan bo'lsa POST /issues/:id/resubmit
export default function EditIssueScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const issue = useFetch<IssueDetail>(`/issues/${id}`);

  return (
    <Screen>
      <AsyncView data={issue.data} loading={issue.loading} error={issue.error} onRetry={issue.reload}>
        {(i) =>
          i.status === 'PENDING_REVIEW' || i.status === 'REJECTED' ? (
            <>
              {i.status === 'REJECTED' && i.rejectedReason ? (
                <Text>Admin izohi: {i.rejectedReason}</Text>
              ) : null}
              <IssueForm
                initial={{
                  title: i.title,
                  description: i.description,
                  locationText: i.locationText,
                  category: i.category,
                  roundKind: i.roundKind ?? 'MONTHLY',
                  media: i.media,
                }}
                submitLabel={i.status === 'REJECTED' ? 'Tuzatib qayta yuborish' : 'Saqlash'}
                onSubmit={async (values) => {
                  await api(`/issues/${i.id}`, { method: 'PATCH', json: values });
                  if (i.status === 'REJECTED') await api(`/issues/${i.id}/resubmit`, { method: 'POST' });
                  Alert.alert(
                    'Saqlandi',
                    i.status === 'REJECTED' ? 'Muammo qayta moderatsiyaga yuborildi.' : "O'zgarishlar saqlandi.",
                  );
                  router.back();
                }}
              />
            </>
          ) : (
            <Text>Bu muammoni endi tahrirlab bo&apos;lmaydi.</Text>
          )
        }
      </AsyncView>
    </Screen>
  );
}
