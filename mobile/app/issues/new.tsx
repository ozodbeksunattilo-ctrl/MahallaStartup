import { useRouter } from 'expo-router';
import { Alert } from 'react-native';
import { IssueForm } from '@/components/IssueForm';
import { Screen } from '@/components/Screen';
import { api } from '@/lib/api';
import type { IssueDetail } from '@/lib/types';

// API: POST /media (har fayl) -> POST /issues (Idempotency-Key). IssueForm yuklash va kalitni boshqaradi.
export default function NewIssueScreen() {
  const router = useRouter();

  return (
    <Screen>
      <IssueForm
        submitLabel="Muammo yuborish"
        onSubmit={async (values, idempotencyKey) => {
          const created = await api<IssueDetail>('/issues', {
            method: 'POST',
            json: values,
            idempotencyKey,
          });
          Alert.alert('Yuborildi', "Muammoingiz moderatsiyaga tushdi. Tasdiqlangach ovozga chiqadi.");
          router.replace(`/issues/${created.id}`);
        }}
      />
    </Screen>
  );
}
