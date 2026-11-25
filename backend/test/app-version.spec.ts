import { afterAll, describe, expect, it } from 'vitest';
import { createTestApp, type TestApp } from './helpers';

describe('GET /app/version (mobil yangilash oynasi)', () => {
  const apps: TestApp[] = [];
  afterAll(async () => {
    for (const a of apps) await a.close();
  });

  it("sozlanmagan bo'lsa android: null (oyna chiqmaydi), login shart emas", async () => {
    const t = await createTestApp();
    apps.push(t);
    const res = await t.req('GET', '/api/v1/app/version');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ android: null });
  });

  it('env berilsa so‘nggi versiya, majburiy versiya va havola qaytadi', async () => {
    const t = await createTestApp({
      MOBILE_LATEST_VERSION: '0.2.0',
      MOBILE_MIN_VERSION: '0.1.0',
      MOBILE_DOWNLOAD_URL: 'https://expo.dev/artifacts/eas/test.apk',
    });
    apps.push(t);
    const res = await t.req('GET', '/api/v1/app/version');
    expect(res.body.android).toEqual({
      latestVersion: '0.2.0',
      minVersion: '0.1.0',
      downloadUrl: 'https://expo.dev/artifacts/eas/test.apk',
      notes: null,
    });
  });
});
