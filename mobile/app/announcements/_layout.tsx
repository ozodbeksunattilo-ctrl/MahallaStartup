import { Stack } from 'expo-router';
import { useStackScreenOptions } from '@/lib/navigation';
import { useLang } from '@/lib/i18n';

export default function AnnouncementsLayout() {
  const { t } = useLang();
  return (
    <Stack screenOptions={useStackScreenOptions()}>
      <Stack.Screen name="index" options={{ title: t("E'lonlar") }} />
      <Stack.Screen name="[id]" options={{ title: t("E'lon") }} />
    </Stack>
  );
}
