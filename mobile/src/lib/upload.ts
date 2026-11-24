import * as ImageManipulator from 'expo-image-manipulator';
import type { ImagePickerAsset } from 'expo-image-picker';
import { api, newKey } from './api';

export const MAX_IMAGES = 3;
export const MAX_VIDEOS = 1;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 25 * 1024 * 1024;

export interface Attachment {
  /** Lokal kalit (UI ro'yxati uchun) */
  localId: string;
  /** Qayta urinishda bir xil: server bitta fayl uchun dublikat yaratmaydi (`clientUploadId`) */
  clientUploadId: string;
  kind: 'IMAGE' | 'VIDEO';
  uri: string;
  name: string;
  mime: string;
  sizeBytes: number | null;
  status: 'pending' | 'uploading' | 'done' | 'error';
  mediaId?: string;
  error?: string;
}

/** HEIC/katta rasmlarni JPEG ga o'giradi (server HEIC ni qabul qilmaydi, 415). */
async function toJpeg(asset: ImagePickerAsset): Promise<{ uri: string; size: number | null }> {
  const out = await ImageManipulator.manipulateAsync(asset.uri, [{ resize: { width: 2048 } }], {
    compress: 0.8,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  const res = await fetch(out.uri).catch(() => null);
  const blob = res ? await res.blob().catch(() => null) : null;
  return { uri: out.uri, size: blob?.size ?? null };
}

export async function toAttachment(asset: ImagePickerAsset): Promise<Attachment> {
  const isVideo = asset.type === 'video';
  const localId = newKey();
  if (isVideo) {
    return {
      localId,
      clientUploadId: newKey(),
      kind: 'VIDEO',
      uri: asset.uri,
      name: asset.fileName ?? 'video.mp4',
      mime: asset.mimeType ?? 'video/mp4',
      sizeBytes: asset.fileSize ?? null,
      status: 'pending',
    };
  }
  const jpeg = await toJpeg(asset);
  return {
    localId,
    clientUploadId: newKey(),
    kind: 'IMAGE',
    uri: jpeg.uri,
    name: 'photo.jpg',
    mime: 'image/jpeg',
    sizeBytes: jpeg.size,
    status: 'pending',
  };
}

/** Bitta faylni yuklaydi. Xatoda xuddi shu `clientUploadId` bilan qayta chaqirish xavfsiz (idempotent). */
export async function uploadAttachment(a: Attachment): Promise<string> {
  const form = new FormData();
  // React Native FormData: fayl `{ uri, name, type }` ko'rinishida beriladi
  form.append('file', { uri: a.uri, name: a.name, type: a.mime } as unknown as Blob);
  form.append('clientUploadId', a.clientUploadId);
  const res = await api<{ mediaId: string }>('/media', { method: 'POST', form });
  return res.mediaId;
}
