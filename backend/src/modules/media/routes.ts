import { AppError } from '../../common/app-error';
import { route } from '../../core/http';
import { idParam } from '../../core/schemas';
import { MEDIA_URL_TTL_SEC } from '../issues/dto';
import { requireVisibleIssue } from '../issues/service';
import { uploadMedia } from './service';

const upload = route({
  method: 'post',
  path: '/media',
  auth: 'user',
  tag: 'Media',
  summary: 'Media yuklash (multipart: file + clientUploadId)',
  description:
    "Rasm: JPEG/PNG/WebP, 5 MB gacha (413 FILE_TOO_LARGE); video: MP4/QuickTime, 25 MB gacha. Tur magic bytes bilan aniqlanadi (415). " +
    "Rasmdagi EXIF/GPS o'chiriladi. Bir xil `clientUploadId` dublikat yaratmaydi (o'sha media qaytadi, 200).",
  // Har fayl 25 MB gacha diskka yoziladi: cheksiz yuklash bilan xotira/diskni to'ldirib bo'lmasin
  limit: { name: 'media-upload', limit: 60, windowSec: 3600 },
  status: 201,
  handler: async (ctx) => {
    const { result, created } = await uploadMedia(ctx.deps, ctx.user, ctx.req);
    if (!created) ctx.status = 200;
    return result;
  },
});

interface MediaOwnerRow {
  id: string;
  owner_id: string;
  storage_key: string;
  thumb_key: string | null;
  issue_id: string | null;
  issue_update_id: string | null;
  event_id: string | null;
}

const url = route({
  method: 'get',
  path: '/media/:id/url',
  auth: 'user',
  tag: 'Media',
  summary: "Media uchun 5 daqiqalik o'qish URL'i (ruxsat tekshiruvidan keyin)",
  params: idParam,
  handler: async ({ deps, user, params, now }) => {
    const r = await deps.db.query<MediaOwnerRow>(
      `SELECT id, owner_id, storage_key, thumb_key, issue_id, issue_update_id, event_id
         FROM media WHERE id = $1 AND mahalla_id = $2`,
      [params.id, user.mahallaId],
    );
    const m = r.rows[0];
    if (!m) throw new AppError('NOT_FOUND');

    if (m.issue_id || m.issue_update_id) {
      const issueId =
        m.issue_id ??
        (
          await deps.db.query<{ issue_id: string }>('SELECT issue_id FROM issue_updates WHERE id = $1', [
            m.issue_update_id,
          ])
        ).rows[0]?.issue_id;
      if (!issueId) throw new AppError('NOT_FOUND');
      // Yashirilgan post media'si oddiy foydalanuvchiga (muallifga ham) berilmaydi
      const { vis } = await requireVisibleIssue(deps.db, user, issueId);
      if (vis !== 'full') throw new AppError('NOT_FOUND');
    } else if (m.event_id) {
      const e = await deps.db.query<{ status: string }>('SELECT status FROM events WHERE id = $1 AND mahalla_id = $2', [
        m.event_id,
        user.mahallaId,
      ]);
      const ev = e.rows[0];
      if (!ev || (ev.status === 'DRAFT' && user.role !== 'MAHALLA_ADMIN')) throw new AppError('NOT_FOUND');
    } else if (m.owner_id !== user.userId) {
      // Hali biriktirilmagan media — faqat egasiga
      throw new AppError('NOT_FOUND');
    }

    return {
      url: await deps.storage.signedUrl(m.storage_key, MEDIA_URL_TTL_SEC, now),
      thumbUrl: m.thumb_key ? await deps.storage.signedUrl(m.thumb_key, MEDIA_URL_TTL_SEC, now) : null,
      expiresAt: new Date(now.getTime() + MEDIA_URL_TTL_SEC * 1000),
    };
  },
});

export const mediaRoutes = [upload, url];
