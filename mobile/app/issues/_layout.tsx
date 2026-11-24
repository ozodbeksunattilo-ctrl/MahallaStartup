import { Stack } from 'expo-router';
import { useStackScreenOptions } from '@/lib/navigation';
import { useLang } from '@/lib/i18n';

export default function IssuesLayout() {
  const { t } = useLang();
  return (
    <Stack screenOptions={useStackScreenOptions()}>
      <Stack.Screen name="new" options={{ title: t('Muammo yuborish') }} />
      <Stack.Screen name="mine" options={{ title: t('Mening muammolarim') }} />
      <Stack.Screen name="[id]/index" options={{ title: t('Muammo') }} />
      <Stack.Screen name="[id]/edit" options={{ title: t('Tahrirlash') }} />
    </Stack>
  );
}
