import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createIssue, jpeg, key, openIssue, upload, world, type World } from './fixtures';
import { createTestApp, type TestApp } from './helpers';

describe('post va media', () => {
  let t: TestApp;
  let w: World;

  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(async () => {
    await t.close();
  });
  beforeEach(async () => {
    await t.reset();
    w = await world(t, 'mahalla-a', 3);
  });

  const author = () => w.residents[0]!;
  const other = () => w.residents[1]!;

  it("6 MB rasm 413 FILE_TOO_LARGE; soxta kengaytmali fayl 415; bo'sh fayl 400", async () => {
    // Haqiqiy JPEG sarlavhasi + 6 MB ma'lumot
    const big = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(6 * 1024 * 1024, 1)]);
    const tooBig = await upload(t, author(), big);
    expect(tooBig.status).toBe(413);
    expect(tooBig.body.error.code).toBe('FILE_TOO_LARGE');

    const fake = await upload(t, author(), Buffer.from('bu rasm emas, oddiy matn fayli. '.repeat(10)), { name: 'rasm.jpg', type: 'image/jpeg' });
    expect(fake.status).toBe(415);
    expect(fake.body.error.code).toBe('UNSUPPORTED_MEDIA_TYPE');

    // HEIC (ftyp heic) ruxsat etilmaydi
    const heic = Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from('ftypheic'), Buffer.alloc(64)]);
    expect((await upload(t, author(), heic, { name: 'a.heic' })).status).toBe(415);
  });

  it("GPS'li JPEG yuklangach saqlangan faylda EXIF yo'q; rasm 2048 px ga kichraytiriladi; thumbnail bor", async () => {
    const src = await jpeg({ width: 3000, height: 2000, gps: true });
    expect((await sharp(src).metadata()).exif).toBeDefined(); // manba haqiqatan EXIF/GPS'li

    const res = await upload(t, author(), src);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ kind: 'IMAGE', width: 2048, height: 1365 });

    const row = (await t.db.query<{ storage_key: string; thumb_key: string }>('SELECT storage_key, thumb_key FROM media WHERE id = $1', [res.body.mediaId])).rows[0]!;
    const stored = fs.readFileSync(path.join(t.deps.env.STORAGE_DIR, row.storage_key));
    const meta = await sharp(stored).metadata();
    expect(meta.exif).toBeUndefined();
    expect(meta.format).toBe('jpeg');
    expect(meta.width).toBe(2048);
    const thumb = await sharp(fs.readFileSync(path.join(t.deps.env.STORAGE_DIR, row.thumb_key))).metadata();
    expect(thumb.width).toBe(480);
    expect(thumb.exif).toBeUndefined();
  });

  it('bir xil clientUploadId va Idempotency-Key dublikat yaratmaydi', async () => {
    const file = await jpeg();
    const id = crypto.randomUUID();
    const a = await upload(t, author(), file, { clientUploadId: id });
    const b = await upload(t, author(), file, { clientUploadId: id });
    expect(a.status).toBe(201);
    expect(b.status).toBe(200);
    expect(b.body.mediaId).toBe(a.body.mediaId);
    expect((await t.db.query('SELECT 1 FROM media WHERE owner_id = $1', [author().id])).rows).toHaveLength(1);

    const k = key();
    const first = await createIssue(t, author(), { key: k, mediaIds: [a.body.mediaId] });
    const replay = await createIssue(t, author(), { key: k, mediaIds: [a.body.mediaId] });
    expect(first.status).toBe(201);
    expect(first.body.isFollowing).toBe(true); // TZ: muallif o'z postini avtomatik kuzatadi
    expect(replay.status).toBe(200);
    expect(replay.body.id).toBe(first.body.id);
    expect((await t.db.query('SELECT 1 FROM issues')).rows).toHaveLength(1);

    const noKey = await t.req('POST', '/api/v1/issues', {
      token: author().token,
      json: { title: 'Sarlavha', description: 'Tavsif matni yetarli', category: 'ROAD', locationText: 'Joy' },
    });
    expect(noKey.status).toBe(400);
    expect(noKey.body.error.details.fields['Idempotency-Key']).toBeTruthy();
  });

  it('media tekshiruvi: boshqa birovniki, ishlatilgan yoki chegaradan ortiq media rad etiladi', async () => {
    const mine = (await upload(t, author(), await jpeg())).body.mediaId as string;
    const theirs = (await upload(t, other(), await jpeg())).body.mediaId as string;
    expect((await createIssue(t, author(), { mediaIds: [theirs] })).status).toBe(400);

    expect((await createIssue(t, author(), { mediaIds: [mine] })).status).toBe(201);
    expect((await createIssue(t, author(), { mediaIds: [mine] })).status).toBe(409); // allaqachon ishlatilgan

    const four: string[] = [];
    for (let i = 0; i < 4; i += 1) four.push((await upload(t, author(), await jpeg())).body.mediaId);
    const res = await createIssue(t, author(), { mediaIds: four });
    expect(res.status).toBe(400);
    expect(res.body.error.details.fields.mediaIds).toBeTruthy();
  });

  it('post detalida media URL’lari bor va ishlaydi; ruxsatsiz /media/:id/url 404', async () => {
    const m = (await upload(t, author(), await jpeg())).body.mediaId as string;
    const issue = (await createIssue(t, author(), { mediaIds: [m] })).body.id as string;
    await t.req('POST', `/api/v1/admin/issues/${issue}/approve`, { token: w.admin.token });

    const detail = await t.req('GET', `/api/v1/issues/${issue}`, { token: other().token });
    expect(detail.status).toBe(200);
    expect(detail.body.media).toHaveLength(1);
    const { url, thumbUrl } = detail.body.media[0];
    for (const u of [url, thumbUrl]) {
      const file = await fetch(u.replace('http://localhost:3000', t.base));
      expect(file.status).toBe(200);
      expect(file.headers.get('content-type')).toBe('image/jpeg');
    }
    // Imzo buzilsa 404
    expect((await fetch(url.replace('http://localhost:3000', t.base).replace(/sig=[0-9a-f]{4}/, 'sig=0000'))).status).toBe(404);

    expect((await t.req('GET', `/api/v1/media/${m}/url`, { token: other().token })).status).toBe(200);
    // Hali biriktirilmagan media — faqat egasiga
    const loose = (await upload(t, author(), await jpeg())).body.mediaId as string;
    expect((await t.req('GET', `/api/v1/media/${loose}/url`, { token: author().token })).status).toBe(200);
    expect((await t.req('GET', `/api/v1/media/${loose}/url`, { token: other().token })).status).toBe(404);

    // Lentada thumbnail
    const feed = await t.req('GET', '/api/v1/issues', { token: other().token });
    expect(feed.body.items[0].thumbUrl).toBeTruthy();
  });

  it("yashirilgan post media URL'i oddiy foydalanuvchiga (muallifga ham) berilmaydi; muallif 'yashirilgan' belgisini ko'radi", async () => {
    const m = (await upload(t, author(), await jpeg())).body.mediaId as string;
    const issue = (await createIssue(t, author(), { mediaIds: [m] })).body.id as string;
    await t.req('POST', `/api/v1/admin/issues/${issue}/approve`, { token: w.admin.token });
    await t.req('POST', `/api/v1/admin/content/post/${issue}/hide`, { token: w.admin.token, json: { reason: 'Nomaqbul kontent' } });

    expect((await t.req('GET', `/api/v1/media/${m}/url`, { token: other().token })).status).toBe(404);
    expect((await t.req('GET', `/api/v1/media/${m}/url`, { token: author().token })).status).toBe(404);
    expect((await t.req('GET', `/api/v1/media/${m}/url`, { token: w.admin.token })).status).toBe(200);

    expect((await t.req('GET', `/api/v1/issues/${issue}`, { token: other().token })).status).toBe(404);
    const own = await t.req('GET', `/api/v1/issues/${issue}`, { token: author().token });
    expect(own.status).toBe(200);
    expect(own.body.hidden).toBe(true);
    expect(own.body.media).toBeUndefined();
    const feed = await t.req('GET', '/api/v1/issues', { token: other().token });
    expect(feed.body.items).toHaveLength(0);
    const mine = await t.req('GET', '/api/v1/issues/mine', { token: author().token });
    expect(mine.body.items[0]).toMatchObject({ hidden: true, thumbUrl: null });

    await t.req('POST', `/api/v1/admin/content/post/${issue}/unhide`, { token: w.admin.token });
    expect((await t.req('GET', `/api/v1/issues/${issue}`, { token: other().token })).status).toBe(200);
  });

  it("rad etish sababi muallifga ko'rinadi, tahrir + qayta yuborish ishlaydi; kutilayotgan postni boshqa aholi ko'rmaydi", async () => {
    const issue = (await createIssue(t, author(), { title: 'Eski sarlavha' })).body.id as string;
    expect((await t.req('GET', `/api/v1/issues/${issue}`, { token: other().token })).status).toBe(404);
    expect((await t.req('GET', '/api/v1/issues', { token: other().token })).body.items).toHaveLength(0);
    expect((await t.req('GET', '/api/v1/admin/moderation/queue', { token: w.admin.token })).body.items).toHaveLength(1);

    expect((await t.req('POST', `/api/v1/admin/issues/${issue}/reject`, { token: w.admin.token, json: { reason: 'x' } })).status).toBe(400);
    const rejected = await t.req('POST', `/api/v1/admin/issues/${issue}/reject`, { token: w.admin.token, json: { reason: "Aniq manzil ko'rsatilmagan" } });
    expect(rejected.status).toBe(200);
    expect(rejected.body.status).toBe('REJECTED');

    const mine = await t.req('GET', '/api/v1/issues/mine', { token: author().token });
    expect(mine.body.items[0]).toMatchObject({ status: 'REJECTED', rejectedReason: "Aniq manzil ko'rsatilmagan", statusLabel: 'Tuzatish kerak' });
    const note = await t.db.query<{ type: string; body: string }>('SELECT type, body FROM notifications WHERE user_id = $1', [author().id]);
    expect(note.rows[0]).toMatchObject({ type: 'ISSUE_REJECTED' });
    expect(note.rows[0]!.body).toContain("Aniq manzil ko'rsatilmagan");

    // faqat PENDING_REVIEW/REJECTED da tahrir; boshqa aholi tahrirlay olmaydi
    expect((await t.req('PATCH', `/api/v1/issues/${issue}`, { token: other().token, json: { title: 'Hack hack' } })).status).toBe(404);
    const edited = await t.req('PATCH', `/api/v1/issues/${issue}`, { token: author().token, json: { title: 'Yangi sarlavha', locationText: "Aniq manzil: Navoiy 5" } });
    expect(edited.status).toBe(200);
    expect(edited.body.title).toBe('Yangi sarlavha');
    const resubmitted = await t.req('POST', `/api/v1/issues/${issue}/resubmit`, { token: author().token });
    expect(resubmitted.body.status).toBe('PENDING_REVIEW');
    expect(resubmitted.body.rejectedReason).toBeNull();
    expect((await t.req('GET', '/api/v1/admin/moderation/queue', { token: w.admin.token })).body.items[0].title).toBe('Yangi sarlavha');

    // tasdiqlangan postni muallif tahrirlay/o'chira olmaydi
    await t.req('POST', `/api/v1/admin/issues/${issue}/approve`, { token: w.admin.token });
    expect((await t.req('PATCH', `/api/v1/issues/${issue}`, { token: author().token, json: { title: 'Yana yangi' } })).status).toBe(409);
    expect((await t.req('DELETE', `/api/v1/issues/${issue}`, { token: author().token })).status).toBe(409);
  });

  it("muallif PENDING postni o'chira oladi (soft delete)", async () => {
    const issue = (await createIssue(t, author())).body.id as string;
    expect((await t.req('DELETE', `/api/v1/issues/${issue}`, { token: author().token })).status).toBe(204);
    expect((await t.req('GET', `/api/v1/issues/${issue}`, { token: author().token })).status).toBe(404);
    const row = await t.db.query('SELECT deleted_at FROM issues WHERE id = $1', [issue]);
    expect(row.rows[0]!['deleted_at']).not.toBeNull();
  });

  it("dublikat (merge): MERGED, duplicateOf, muallif asosiy postni avtomatik kuzatadi", async () => {
    const main = await openIssue(t, w, other(), 'Asosiy post');
    const dup = (await createIssue(t, author(), { title: 'Dublikat post' })).body.id as string;

    expect((await t.req('POST', `/api/v1/admin/issues/${dup}/merge`, { token: w.admin.token, json: { targetIssueId: dup } })).status).toBe(400);
    const merged = await t.req('POST', `/api/v1/admin/issues/${dup}/merge`, { token: w.admin.token, json: { targetIssueId: main } });
    expect(merged.status).toBe(200);
    expect(merged.body.status).toBe('MERGED');
    expect(merged.body.duplicateOf).toEqual({ id: main, title: 'Asosiy post' });

    const mine = await t.req('GET', '/api/v1/issues/mine', { token: author().token });
    expect(mine.body.items[0].duplicateOf).toEqual({ id: main, title: 'Asosiy post' });
    const follow = await t.req('GET', `/api/v1/issues/${main}`, { token: author().token });
    expect(follow.body.isFollowing).toBe(true);
    // Merged post oddiy foydalanuvchiga ko'rinmaydi
    expect((await t.req('GET', `/api/v1/issues/${dup}`, { token: w.residents[2]!.token })).status).toBe(404);
  });

  it("izohlar: faqat ko'rinadigan postga, commentCount oshadi, yashirilgani ro'yxatdan chiqadi", async () => {
    const pending = (await createIssue(t, author())).body.id as string;
    expect((await t.req('POST', `/api/v1/issues/${pending}/comments`, { token: author().token, json: { text: 'Salom' } })).status).toBe(409);

    const issue = await openIssue(t, w, author(), 'Izoh uchun');
    const c1 = await t.req('POST', `/api/v1/issues/${issue}/comments`, { token: other().token, json: { text: "  Men ham ko'rdim  " } });
    expect(c1.status).toBe(201);
    expect(c1.body.text).toBe("Men ham ko'rdim");
    await t.req('POST', `/api/v1/issues/${issue}/comments`, { token: w.residents[2]!.token, json: { text: 'Qo‘llab-quvvatlayman' } });

    const list = await t.req('GET', `/api/v1/issues/${issue}/comments`, { token: author().token });
    expect(list.body.items.map((c: { text: string }) => c.text)).toEqual(["Men ham ko'rdim", 'Qo‘llab-quvvatlayman']);
    expect((await t.req('GET', `/api/v1/issues/${issue}`, { token: author().token })).body.commentCount).toBe(2);

    await t.req('POST', `/api/v1/admin/content/comment/${c1.body.id}/hide`, { token: w.admin.token, json: { reason: 'Haqorat' } });
    expect((await t.req('GET', `/api/v1/issues/${issue}/comments`, { token: author().token })).body.items).toHaveLength(1);
    expect((await t.req('GET', `/api/v1/issues/${issue}/comments`, { token: w.admin.token })).body.items).toHaveLength(2);
    // commentCount faqat ko'rinadigan izohlarni sanaydi; takroriy yashirish ikki marta kamaytirmaydi
    const count = async () => (await t.req('GET', `/api/v1/issues/${issue}`, { token: author().token })).body.commentCount;
    expect(await count()).toBe(1);
    await t.req('POST', `/api/v1/admin/content/comment/${c1.body.id}/hide`, { token: w.admin.token, json: { reason: 'Haqorat' } });
    expect(await count()).toBe(1);
    await t.req('POST', `/api/v1/admin/content/comment/${c1.body.id}/unhide`, { token: w.admin.token });
    expect(await count()).toBe(2);
  });

  it('validatsiya xatolari yagona formatda (o‘zbekcha xabar + details.fields)', async () => {
    const res = await t.req('POST', '/api/v1/issues', {
      token: author().token,
      headers: { 'Idempotency-Key': key() },
      json: { title: 'abc', description: 'qisqa', category: 'NOTO_G_RI', locationText: '' },
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toBe("So'rov ma'lumotlari noto'g'ri");
    expect(Object.keys(res.body.error.details.fields).sort()).toEqual(['category', 'description', 'locationText', 'title']);
    expect(res.body.error.details.fields.title).toBe("5–120 belgi bo'lsin");
  });
});
