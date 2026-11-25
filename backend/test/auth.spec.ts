import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { actor, createMahalla, createTestApp, createUser, loginToken, PASSWORD, type TestApp } from './helpers';

describe('parol va sessiya', () => {
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
    mahallaId = await createMahalla(t);
  });

  it("login muvaffaqiyatli: mobil token qaytaradi, /me ishlaydi", async () => {
    await createUser(t, mahallaId, 'ali');
    const res = await t.req('POST', '/api/v1/auth/login', {
      json: { login: 'ALI', password: PASSWORD, client: 'mobile' },
    });
    expect(res.status).toBe(200);
    expect(res.body.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(res.body.mustChangePassword).toBe(false);

    const me = await t.req('GET', '/api/v1/me', { token: res.body.token });
    expect(me.status).toBe(200);
    expect(me.body.user.login).toBe('ali');
    expect(me.body.role).toBe('RESIDENT');
  });

  it("noto'g'ri parol va noma'lum login bir xil xato beradi", async () => {
    await createUser(t, mahallaId, 'ali');
    const a = await t.req('POST', '/api/v1/auth/login', { json: { login: 'ali', password: 'xxx', client: 'mobile' } });
    const b = await t.req('POST', '/api/v1/auth/login', { json: { login: 'yoq', password: 'xxx', client: 'mobile' } });
    expect(a.status).toBe(401);
    expect(a.body.error.code).toBe('INVALID_CREDENTIALS');
    expect(b.body).toEqual(a.body);
  });

  it('birinchi kirishda boshqa endpoint 403 PASSWORD_CHANGE_REQUIRED, almashtirgach ochiladi', async () => {
    await createUser(t, mahallaId, 'yangi', 'RESIDENT', {
      mustChange: true,
      tempExpiresAt: new Date(t.clock.now().getTime() + 3600_000),
    });
    const token = await loginToken(t, 'yangi');

    expect((await t.req('GET', '/api/v1/me', { token })).body.mustChangePassword).toBe(true);
    const blocked = await t.req('GET', '/api/v1/notifications', { token });
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.code).toBe('PASSWORD_CHANGE_REQUIRED');

    const bad = await t.req('POST', '/api/v1/auth/change-password', {
      token,
      json: { currentPassword: PASSWORD, newPassword: 'short' },
    });
    expect(bad.status).toBe(400);
    const same = await t.req('POST', '/api/v1/auth/change-password', {
      token,
      json: { currentPassword: PASSWORD, newPassword: PASSWORD },
    });
    expect(same.status).toBe(400);

    const ok = await t.req('POST', '/api/v1/auth/change-password', {
      token,
      json: { currentPassword: PASSWORD, newPassword: 'YangiParol123' },
    });
    expect(ok.status).toBe(204);
    expect((await t.req('GET', '/api/v1/me', { token })).body.mustChangePassword).toBe(false);

    const relogin = await t.req('POST', '/api/v1/auth/login', {
      json: { login: 'yangi', password: 'YangiParol123', client: 'mobile' },
    });
    expect(relogin.status).toBe(200);
  });

  it('muddati o‘tgan vaqtinchalik parol bilan kirish 401 TEMP_PASSWORD_EXPIRED', async () => {
    await createUser(t, mahallaId, 'eski', 'RESIDENT', {
      mustChange: true,
      tempExpiresAt: new Date(t.clock.now().getTime() - 1000),
    });
    const res = await t.req('POST', '/api/v1/auth/login', { json: { login: 'eski', password: PASSWORD, client: 'mobile' } });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TEMP_PASSWORD_EXPIRED');
  });

  it('admin bloklagan foydalanuvchining eski tokeni darhol 401; tiklagan bo‘lsa ham', async () => {
    const admin = await actor(t, mahallaId, 'admin1', 'MAHALLA_ADMIN');
    const resident = await actor(t, mahallaId, 'vali');
    // token keshga tushsin
    expect((await t.req('GET', '/api/v1/me', { token: resident.token })).status).toBe(200);

    const blocked = await t.req('POST', `/api/v1/admin/residents/${resident.id}/block`, {
      token: admin.token,
      json: { reason: 'Qoidabuzarlik' },
    });
    expect(blocked.status).toBe(200);
    expect((await t.req('GET', '/api/v1/me', { token: resident.token })).status).toBe(401);

    await t.req('POST', `/api/v1/admin/residents/${resident.id}/unblock`, { token: admin.token });
    const again = await t.req('POST', '/api/v1/auth/login', { json: { login: 'vali', password: PASSWORD, client: 'mobile' } });
    expect(again.status).toBe(200);

    // parol tiklash -> eski token 401
    const tok = again.body.token as string;
    expect((await t.req('GET', '/api/v1/me', { token: tok })).status).toBe(200);
    const reset = await t.req('POST', `/api/v1/admin/residents/${resident.id}/reset-password`, { token: admin.token });
    expect(reset.status).toBe(200);
    expect(reset.body.temporaryPassword).toMatch(/^[A-HJ-NP-Za-km-z2-9]{10}$/);
    expect((await t.req('GET', '/api/v1/me', { token: tok })).status).toBe(401);
  });

  it('parolni o‘zi almashtirsa — boshqa sessiyalari bekor, joriysi qoladi', async () => {
    await createUser(t, mahallaId, 'sara');
    const a = await loginToken(t, 'sara');
    const b = await loginToken(t, 'sara');
    const res = await t.req('POST', '/api/v1/auth/change-password', {
      token: a,
      json: { currentPassword: PASSWORD, newPassword: 'BoshqaParol99' },
    });
    expect(res.status).toBe(204);
    expect((await t.req('GET', '/api/v1/me', { token: a })).status).toBe(200);
    expect((await t.req('GET', '/api/v1/me', { token: b })).status).toBe(401);
  });

  it('6-xato login 429 TOO_MANY_ATTEMPTS (to‘g‘ri parol ham o‘tmaydi)', async () => {
    await createUser(t, mahallaId, 'qiyin');
    for (let i = 0; i < 5; i += 1) {
      const r = await t.req('POST', '/api/v1/auth/login', { json: { login: 'qiyin', password: 'xato', client: 'mobile' } });
      expect(r.status).toBe(401);
    }
    const sixth = await t.req('POST', '/api/v1/auth/login', { json: { login: 'qiyin', password: PASSWORD, client: 'mobile' } });
    expect(sixth.status).toBe(429);
    expect(sixth.body.error.code).toBe('TOO_MANY_ATTEMPTS');
    expect(Number(sixth.headers.get('retry-after'))).toBeGreaterThan(0);
  });

  it('logout tokenni bekor qiladi', async () => {
    await createUser(t, mahallaId, 'chiq');
    const token = await loginToken(t, 'chiq');
    expect((await t.req('POST', '/api/v1/auth/logout', { token })).status).toBe(204);
    expect((await t.req('GET', '/api/v1/me', { token })).status).toBe(401);
  });

  it('veb: cookie + CSRF double-submit + Origin tekshiruvi', async () => {
    await createUser(t, mahallaId, 'veb');
    const login = await t.req('POST', '/api/v1/auth/login', { json: { login: 'veb', password: PASSWORD, client: 'web' } });
    expect(login.status).toBe(200);
    expect(login.body.token).toBeUndefined();
    const cookies = login.headers.getSetCookie();
    const session = cookies.find((c) => c.startsWith('mhd_session='))!;
    const csrf = cookies.find((c) => c.startsWith('mhd_csrf='))!;
    expect(session).toMatch(/HttpOnly/i);
    expect(session).toMatch(/SameSite=Lax/i);
    const cookieHeader = `${session.split(';')[0]}; ${csrf.split(';')[0]}`;
    const csrfValue = csrf.split(';')[0]!.split('=')[1]!;

    // GET uchun CSRF kerak emas
    expect((await t.req('GET', '/api/v1/me', { headers: { Cookie: cookieHeader } })).status).toBe(200);

    const post = (headers: Record<string, string>) =>
      t.req('POST', '/api/v1/auth/change-password', {
        headers: { Cookie: cookieHeader, ...headers },
        json: { currentPassword: PASSWORD, newPassword: 'WebParol12345' },
      });
    expect((await post({})).body.error.code).toBe('CSRF_INVALID');
    expect((await post({ Origin: 'http://localhost:3001' })).body.error.code).toBe('CSRF_INVALID');
    expect((await post({ Origin: 'http://evil.example', 'X-CSRF-Token': csrfValue })).body.error.code).toBe('CSRF_INVALID');
    expect((await post({ Origin: 'http://localhost:3001', 'X-CSRF-Token': csrfValue })).status).toBe(204);
  });

  it('veb: sliding sessiyada CSRF cookie ham sessiya bilan birga uzaytiriladi', async () => {
    await createUser(t, mahallaId, 'uzoq');
    const login = await t.req('POST', '/api/v1/auth/login', { json: { login: 'uzoq', password: PASSWORD, client: 'web' } });
    const cookies = login.headers.getSetCookie();
    const session = cookies.find((c) => c.startsWith('mhd_session='))!.split(';')[0]!;
    const csrf = cookies.find((c) => c.startsWith('mhd_csrf='))!.split(';')[0]!;

    t.clock.advance(10 * 60_000);
    t.kv.clear(); // sessiya keshi: DB'dan o'qilib, muddat uzaytirilsin
    const me = await t.req('GET', '/api/v1/me', { headers: { Cookie: `${session}; ${csrf}` } });
    expect(me.status).toBe(200);
    const refreshed = me.headers.getSetCookie();
    expect(refreshed.find((c) => c.startsWith('mhd_session='))).toBeDefined();
    // CSRF qiymati o'zgarmaydi (ochiq tablar ishlashda davom etadi), faqat muddati yangilanadi
    expect(refreshed.find((c) => c.startsWith('mhd_csrf='))?.split(';')[0]).toBe(csrf);
  });

  it("rol tekshiruvi: aholi admin endpointiga kira olmaydi", async () => {
    const resident = await actor(t, mahallaId, 'oddiy');
    const res = await t.req('GET', '/api/v1/admin/residents', { token: resident.token });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect((await t.req('GET', '/api/v1/me')).status).toBe(401);
  });
});
