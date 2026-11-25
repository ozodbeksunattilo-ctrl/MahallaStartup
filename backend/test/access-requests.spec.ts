import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { actor, createMahalla, createTestApp, type TestApp } from './helpers';

describe("ro'yxatdan o'tish (kirish so'rovi)", () => {
  let t: TestApp;
  let mahallaId: string;

  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(async () => {
    await t.close();
  });
  beforeEach(async () => {
    await t.reset();
    mahallaId = await createMahalla(t, 'navbahor', 'Navbahor mahallasi');
    await createMahalla(t, 'guliston', 'Guliston mahallasi');
  });

  it("mahallalar ro'yxati kirishsiz ochiladi va qidiriladi", async () => {
    const all = await t.req('GET', '/api/v1/auth/mahallas');
    expect(all.status).toBe(200);
    expect(all.body.items.map((m: { name: string }) => m.name)).toEqual(['Guliston mahallasi', 'Navbahor mahallasi']);

    const found = await t.req('GET', '/api/v1/auth/mahallas?q=navb');
    expect(found.body.items).toEqual([{ id: mahallaId, name: 'Navbahor mahallasi' }]);
  });

  it("mahallaId bilan so'rov yuboriladi, holati tekshiriladi, admin tasdiqlagach APPROVED", async () => {
    const created = await t.req('POST', '/api/v1/auth/access-requests', {
      json: { fullName: 'Sardor Karimov', phone: '+998 90 123 45 67', mahallaId },
    });
    expect(created.status).toBe(201);
    expect(created.body.status).toBe('PENDING');

    const pending = await t.req('GET', `/api/v1/auth/access-requests/${created.body.id}`);
    expect(pending.status).toBe(200);
    expect(pending.body).toMatchObject({ status: 'PENDING', mahallaName: 'Navbahor mahallasi' });
    // Shaxsiy ma'lumot qaytmaydi
    expect(pending.body.phone).toBeUndefined();

    const admin = await actor(t, mahallaId, 'admin', 'MAHALLA_ADMIN');
    const ok = await t.req('POST', `/api/v1/admin/access-requests/${created.body.id}/approve`, {
      token: admin.token,
      json: { login: 'sardor.k' },
    });
    expect(ok.status).toBe(200);

    const approved = await t.req('GET', `/api/v1/auth/access-requests/${created.body.id}`);
    expect(approved.body.status).toBe('APPROVED');
  });

  it("mahalla ko'rsatilmasa yoki noma'lum bo'lsa — maydon xatosi", async () => {
    const none = await t.req('POST', '/api/v1/auth/access-requests', {
      json: { fullName: 'Sardor Karimov', phone: '+998901234567' },
    });
    expect(none.status).toBe(400);
    expect(none.body.error.details.fields.mahallaName).toBeDefined();

    const unknown = await t.req('POST', '/api/v1/auth/access-requests', {
      json: { fullName: 'Sardor Karimov', phone: '+998901234567', mahallaId: '01900000-0000-7000-8000-000000000000' },
    });
    expect(unknown.status).toBe(400);
    expect(unknown.body.error.details.fields.mahallaId).toBe('Bunday mahalla topilmadi');
  });
});
