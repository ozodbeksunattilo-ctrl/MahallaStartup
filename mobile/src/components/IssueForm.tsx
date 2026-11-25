import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, View } from 'react-native';
import { Button } from './Button';
import { Card } from './Card';
import { Select } from './Select';
import { Field } from './Field';
import { Text } from './Text';
import { ApiError, newKey } from '@/lib/api';
import { haptic } from '@/lib/haptics';
import { errorMessage } from '@/lib/hooks';
import { CATEGORIES } from '@/lib/labels';
import type { Media, RoundKind } from '@/lib/types';
import {
  MAX_IMAGES,
  MAX_IMAGE_BYTES,
  MAX_VIDEOS,
  MAX_VIDEO_BYTES,
  toAttachment,
  uploadAttachment,
  type Attachment,
} from '@/lib/upload';
import { useTheme } from '@/theme';

export interface IssueValues {
  title: string;
  description: string;
  locationText: string;
  category: string;
  mediaIds: string[];
  /** Oylik (standart) yoki haftalik ovoz davri */
  roundKind: RoundKind;
}

interface IssueFormProps {
  initial?: Omit<IssueValues, 'mediaIds'> & { media: Media[] };
  submitLabel: string;
  onSubmit: (values: IssueValues, idempotencyKey: string) => Promise<void>;
}

const EMERGENCY = [
  { n: '101', label: "Yong'in xizmati" },
  { n: '102', label: 'Politsiya' },
  { n: '103', label: 'Tez yordam' },
];

const mb = (b: number) => (b / 1024 / 1024).toFixed(1);

/** Fayl yuklash xatosi: matni formada aynan ko'rsatiladi. */
class UploadFailed extends Error {}

const KINDS: Array<{ value: RoundKind; title: string; hint: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { value: 'MONTHLY', title: 'Oylik ovoz', hint: "Oy oxirida eng ko'p ovoz olgan muammo tanlanadi", icon: 'calendar-outline' },
  { value: 'WEEKLY', title: 'Haftalik ovoz', hint: "Tezkor: g'olib 1 hafta ichida hal qilinadi", icon: 'flash-outline' },
];

/** Muammo qaysi ovoz davriga chiqadi: oylik yoki haftalik (parallel davrlar). */
function RoundKindPicker({ value, onChange }: { value: RoundKind; onChange: (v: RoundKind) => void }) {
  const { colors, radius, spacing } = useTheme();
  return (
    <View style={{ gap: spacing.xs }}>
      <Text variant="label">Ovoz davri</Text>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {KINDS.map((k) => {
          const active = value === k.value;
          return (
            <Pressable
              key={k.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              onPress={() => onChange(k.value)}
              style={{
                flex: 1,
                gap: 4,
                padding: spacing.md,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: active ? colors.primary : colors.border,
                backgroundColor: active ? colors.primarySoft : colors.surface,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name={k.icon} size={16} color={active ? colors.primary : colors.muted} />
                <Text variant="label" style={{ color: active ? colors.primary : colors.text }}>
                  {k.title}
                </Text>
              </View>
              <Text variant="muted" style={{ fontSize: 12, lineHeight: 16 }}>
                {k.hint}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function IssueForm({ initial, submitLabel, onSubmit }: IssueFormProps) {
  const { colors, radius, spacing } = useTheme();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [location, setLocation] = useState(initial?.locationText ?? '');
  const [category, setCategory] = useState<string | null>(initial?.category ?? null);
  const [roundKind, setRoundKind] = useState<RoundKind>(initial?.roundKind ?? 'MONTHLY');
  const [kept, setKept] = useState<Media[]>(initial?.media ?? []);
  const [files, setFiles] = useState<Attachment[]>([]);
  // Bir forma = bitta kalit: tarmoq uzilib qayta yuborilsa dublikat post yaratilmaydi
  const [idempotencyKey] = useState(newKey);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const imageCount = kept.filter((m) => m.kind === 'IMAGE').length + files.filter((f) => f.kind === 'IMAGE').length;
  const videoCount = kept.filter((m) => m.kind === 'VIDEO').length + files.filter((f) => f.kind === 'VIDEO').length;

  /** Yuborishdan oldin tekshiruv: tugma o'chiq turmaydi, nima yetishmasligi maydon ostida ko'rsatiladi */
  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    if (title.trim().length < 5) e.title = "Sarlavha kamida 5 belgi bo'lsin";
    if (description.trim().length < 10) e.description = "Tavsif kamida 10 belgi bo'lsin";
    if (location.trim().length < 3) e.locationText = 'Joyni yozing (kamida 3 belgi)';
    if (category === null) e.category = 'Toifani tanlang';
    return e;
  }

  async function addAssets(assets: ImagePicker.ImagePickerAsset[]) {
    let images = imageCount;
    let videos = videoCount;
    const next: Attachment[] = [];
    const rejected: string[] = [];
    for (const asset of assets) {
      const isVideo = asset.type === 'video';
      if (isVideo ? videos >= MAX_VIDEOS : images >= MAX_IMAGES) {
        rejected.push(isVideo ? "Faqat 1 ta video qo'shish mumkin" : 'Eng ko‘pi bilan 3 ta rasm');
        continue;
      }
      if (isVideo && (asset.fileSize ?? 0) > MAX_VIDEO_BYTES) {
        rejected.push(`Video ${mb(asset.fileSize ?? 0)} MB — 25 MB dan oshmasin`);
        continue;
      }
      const att = await toAttachment(asset).catch(() => null);
      if (!att) {
        rejected.push('Rasmni tayyorlab bo‘lmadi');
        continue;
      }
      if (att.kind === 'IMAGE' && (att.sizeBytes ?? 0) > MAX_IMAGE_BYTES) {
        rejected.push(`Rasm ${mb(att.sizeBytes ?? 0)} MB — 5 MB dan oshmasin`);
        continue;
      }
      if (isVideo) videos += 1;
      else images += 1;
      next.push(att);
    }
    setFiles((prev) => [...prev, ...next]);
    if (rejected.length) Alert.alert('Ba‘zi fayllar qo‘shilmadi', rejected.join('\n'));
  }

  async function pickFromLibrary() {
    const left = MAX_IMAGES - imageCount + (videoCount < MAX_VIDEOS ? MAX_VIDEOS : 0);
    if (left <= 0) return Alert.alert('Limit', '3 ta rasm va 1 ta video qo‘shilgan.');
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      selectionLimit: left,
      videoMaxDuration: 60,
      quality: 1,
    });
    if (!res.canceled) await addAssets(res.assets);
  }

  async function takePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return Alert.alert('Kamera', 'Sozlamalarda kameraga ruxsat bering.');
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images', 'videos'],
      videoMaxDuration: 60,
      quality: 1,
    });
    if (!res.canceled) await addAssets(res.assets);
  }

  async function submit() {
    const invalid = validate();
    if (Object.keys(invalid).length > 0) {
      haptic.warning();
      setFieldErrors(invalid);
      setError(null);
      return;
    }
    setPending(true);
    setError(null);
    setFieldErrors({});
    try {
      // 1) Yuklanmaganlarini yuklaymiz. Muvaffaqiyatlilari qayta yuborilmaydi; xatolari xuddi shu clientUploadId bilan.
      const uploaded: Attachment[] = [];
      for (const f of files) {
        if (f.status === 'done' && f.mediaId) {
          uploaded.push(f);
          continue;
        }
        setFiles((prev) => prev.map((p) => (p.localId === f.localId ? { ...p, status: 'uploading', error: undefined } : p)));
        try {
          const mediaId = await uploadAttachment(f);
          const done = { ...f, status: 'done' as const, mediaId };
          uploaded.push(done);
          setFiles((prev) => prev.map((p) => (p.localId === f.localId ? done : p)));
        } catch (e) {
          setFiles((prev) =>
            prev.map((p) => (p.localId === f.localId ? { ...p, status: 'error', error: errorMessage(e) } : p)),
          );
          // Haqiqiy sabab (masalan, 413 hajm, 415 format, tarmoq) foydalanuvchiga ko'rinsin
          throw new UploadFailed(`Fayl yuklanmadi: ${errorMessage(e)}. “Qayta urinish” ni bosing yoki faylni olib tashlang.`);
        }
      }
      // 2) Postni yuboramiz (bitta Idempotency-Key bilan)
      await onSubmit(
        {
          title: title.trim(),
          description: description.trim(),
          locationText: location.trim(),
          category: category ?? 'OTHER',
          roundKind,
          mediaIds: [...kept.map((m) => m.id), ...uploaded.map((u) => u.mediaId as string)],
        },
        idempotencyKey,
      );
    } catch (e) {
      haptic.error();
      if (e instanceof ApiError && e.code === 'VALIDATION_ERROR') {
        const fields = (e.details as { fields?: Record<string, string> }).fields;
        if (fields) setFieldErrors(fields);
      }
      // errorMessage() faqat ApiError'ni taniydi; yuklash xatosining matni yo'qolmasin
      setError(e instanceof UploadFailed ? e.message : errorMessage(e));
    } finally {
      setPending(false);
    }
  }

  const anyFailed = files.some((f) => f.status === 'error');

  return (
    <>
      <View
        style={{
          backgroundColor: colors.surfaceAlt,
          borderRadius: radius.md,
          padding: spacing.md,
          gap: spacing.sm,
        }}
      >
        <Text variant="label">
          <Ionicons name="warning-outline" size={14} color={colors.warning} /> Shoshilinch xavf bo‘lsa, avval tezkor xizmatga qo‘ng‘iroq qiling
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {EMERGENCY.map((e) => (
            <Pressable
              key={e.n}
              accessibilityRole="button"
              accessibilityLabel={`${e.n} — ${e.label}ga qo‘ng‘iroq qilish`}
              onPress={() => void Linking.openURL(`tel:${e.n}`)}
              style={{
                minHeight: 44,
                paddingHorizontal: spacing.md,
                justifyContent: 'center',
                borderRadius: radius.pill,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
              }}
            >
              <Text variant="label">
                {e.n} · {e.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Field
        label="Sarlavha"
        value={title}
        onChangeText={setTitle}
        maxLength={120}
        hint="5–120 belgi"
        error={fieldErrors.title}
      />
      <Field
        label="Tavsif"
        value={description}
        onChangeText={setDescription}
        maxLength={2000}
        multiline
        hint="10–2000 belgi. Nima bo‘lgan, qachondan beri?"
        error={fieldErrors.description}
      />
      <Field
        label="Joy"
        value={location}
        onChangeText={setLocation}
        maxLength={200}
        hint="Jamoat joyi yoki mo‘ljal (uy manzili yozmang)"
        error={fieldErrors.locationText}
      />

      <Select
        label="Toifa"
        icon="grid-outline"
        iconTone="purple"
        options={CATEGORIES}
        value={category}
        onChange={setCategory}
        error={fieldErrors.category}
      />

      <RoundKindPicker value={roundKind} onChange={setRoundKind} />

      <Card title="Foto va video">
        <Text variant="muted">
          Ixtiyoriy. 3 tagacha rasm (har biri 5 MB gacha) va 1 ta video (25 MB gacha, ~60 soniya).
        </Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {kept.map((m) => (
            <Thumb
              key={m.id}
              uri={m.thumbUrl ?? m.url}
              video={m.kind === 'VIDEO'}
              onRemove={() => setKept((k) => k.filter((x) => x.id !== m.id))}
            />
          ))}
          {files.map((f) => (
            <Thumb
              key={f.localId}
              uri={f.uri}
              video={f.kind === 'VIDEO'}
              state={f.status}
              onRemove={() => setFiles((p) => p.filter((x) => x.localId !== f.localId))}
              disabled={pending}
            />
          ))}
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Button title="Galereya" variant="secondary" onPress={() => void pickFromLibrary()} disabled={pending} />
          </View>
          <View style={{ flex: 1 }}>
            <Button title="Kamera" variant="secondary" onPress={() => void takePhoto()} disabled={pending} />
          </View>
        </View>
        {files.some((f) => f.error) ? (
          <Text variant="muted" style={{ color: colors.danger }}>
            {files.find((f) => f.error)?.error}
          </Text>
        ) : null}
      </Card>

      {error ? (
        <Text accessibilityRole="alert" style={{ color: colors.danger }}>
          {error}
        </Text>
      ) : null}
      <Text variant="muted">Muammo moderator tasdiqlagandan keyin ovoz berishga chiqadi.</Text>
      <Button
        title={anyFailed ? 'Qayta urinish' : submitLabel}
        onPress={() => void submit()}
        icon="paper-plane-outline"
        loading={pending}
      />
    </>
  );
}

function Thumb({
  uri,
  video,
  state,
  onRemove,
  disabled,
}: {
  uri: string;
  video: boolean;
  state?: Attachment['status'];
  onRemove: () => void;
  disabled?: boolean;
}) {
  const { colors, radius } = useTheme();
  return (
    <View style={{ width: 84, height: 84, borderRadius: radius.sm, overflow: 'hidden', backgroundColor: colors.surfaceAlt }}>
      {video ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="videocam" size={30} color={colors.muted} />
        </View>
      ) : (
        <Image source={{ uri }} style={{ flex: 1 }} contentFit="cover" />
      )}
      {state === 'uploading' ? (
        <View
          style={{
            position: 'absolute',
            inset: 0,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.4)',
          }}
        >
          <ActivityIndicator color="#fff" />
        </View>
      ) : null}
      {state === 'done' ? (
        <Ionicons name="checkmark-circle" size={20} color="#22c55e" style={{ position: 'absolute', left: 4, bottom: 4 }} />
      ) : null}
      {state === 'error' ? (
        <Ionicons name="alert-circle" size={20} color={colors.danger} style={{ position: 'absolute', left: 4, bottom: 4 }} />
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Faylni olib tashlash"
        disabled={disabled}
        onPress={onRemove}
        hitSlop={8}
        style={{
          position: 'absolute',
          top: 2,
          right: 2,
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: 'rgba(0,0,0,0.6)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="close" size={16} color="#fff" />
      </Pressable>
    </View>
  );
}
