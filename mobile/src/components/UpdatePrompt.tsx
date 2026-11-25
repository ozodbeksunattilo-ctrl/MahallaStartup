import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import { Linking, Platform } from 'react-native';
import { ConfirmModal } from './ConfirmModal';
import { api } from '@/lib/api';
import { log } from '@/lib/log';

interface AppVersion {
  android: { latestVersion: string; minVersion: string | null; downloadUrl: string; notes: string | null } | null;
}

/** `0.2.0` > `0.1.9`: nuqta bilan ajratilgan sonlarni taqqoslaydi. */
export function isNewer(a: string, b: string): boolean {
  const pa = a.split('.').map((n) => Number.parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => Number.parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d > 0;
  }
  return false;
}

/**
 * Ilova ochilganda backenddan so'nggi versiyani so'raydi (GET /app/version). O'rnatilgan APK eskiroq bo'lsa
 * «Yangilash» oynasi chiqadi va yangi APK havolasi ochiladi. `minVersion` dan eski bo'lsa — majburiy (yopib bo'lmaydi).
 */
export function UpdatePrompt() {
  const [info, setInfo] = useState<NonNullable<AppVersion['android']> | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const current = Constants.expoConfig?.version ?? '0.0.0';

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    api<AppVersion>('/app/version')
      .then((v) => {
        if (v.android && isNewer(v.android.latestVersion, current)) setInfo(v.android);
      })
      // Eski backendda endpoint yo'q yoki tarmoq yo'q — jim o'tamiz, ilova ishlayveradi
      .catch((e: unknown) => log.info('update', 'versiya tekshirilmadi', e instanceof Error ? e.message : e));
  }, [current]);

  if (!info) return null;
  const forced = info.minVersion !== null && isNewer(info.minVersion, current);
  return (
    <ConfirmModal
      visible={!dismissed || forced}
      icon="cloud-download-outline"
      title="Yangi versiya mavjud"
      message={`${current} → ${info.latestVersion}${info.notes ? `\n${info.notes}` : ''}\n\nYangilash uchun yangi ilovani yuklab o'rnating.`}
      confirmTitle="Yangilash"
      cancelTitle="Keyinroq"
      hideCancel={forced}
      onConfirm={() => void Linking.openURL(info.downloadUrl)}
      onCancel={() => setDismissed(true)}
    />
  );
}
