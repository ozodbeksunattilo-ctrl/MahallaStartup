import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { z } from 'zod';
import { examples, responseSchemas } from '../src/contract';
import { createTestApp, type TestApp } from './helpers';

interface Op {
  summary: string;
  description: string;
  requestBody?: { content: Record<string, { examples?: Record<string, unknown> }> };
  responses: Record<string, { description: string; content?: Record<string, { example?: unknown; examples?: Record<string, unknown> }> }>;
  security: unknown[];
}
interface Doc {
  info: { description: string };
  servers: Array<{ url: string }>;
  tags: Array<{ name: string; description?: string }>;
  paths: Record<string, Record<string, Op>>;
}

describe('Swagger (TZ bo‘yicha API hujjati)', () => {
  let t: TestApp;
  let doc: Doc;

  beforeAll(async () => {
    t = await createTestApp();
    doc = (await t.req('GET', '/api/openapi.json')).body as Doc;
  });
  afterAll(async () => {
    await t.close();
  });

  it('Swagger UI internetsiz ishlaydi: HTML va kerakli fayllar lokal beriladi, qolgani yopiq', async () => {
    const page = await fetch(`${t.base}/api/docs`);
    expect(page.status).toBe(200);
    expect(page.headers.get('content-type')).toContain('text/html');
    expect(page.headers.get('content-security-policy')).toContain("script-src 'self'");
    const html = await page.text();
    expect(html).toContain('/api/docs/assets/swagger-ui-bundle.js');
    expect(html).not.toContain('unpkg.com');

    for (const file of ['swagger-ui-bundle.js', 'swagger-ui.css']) {
      const res = await fetch(`${t.base}/api/docs/assets/${file}`);
      expect(res.status, file).toBe(200);
      expect((await res.arrayBuffer()).byteLength).toBeGreaterThan(10_000);
    }
    expect((await fetch(`${t.base}/api/docs/assets/package.json`)).status).toBe(404);
    const init = await fetch(`${t.base}/api/docs/init.js`);
    expect(await init.text()).toContain('/api/openapi.json');
  });

  it("jonli hujjat: «Try it out» shu serverga boradi (relative server), TZ tavsifi va teglar bor", () => {
    expect(doc.servers[0]?.url).toBe('/api/v1');
    expect(doc.info.description).toContain('Tez boshlash');
    expect(doc.info.description).toContain('Oylik ovoz');
    expect(doc.info.description).toContain('Tuzatish kerak'); // TZ 4-bo'lim jadvali
    expect(doc.tags.find((x) => x.name === 'Ovoz')?.description).toContain('TZ 4');
    expect(doc.tags.map((x) => x.name)).toEqual(expect.arrayContaining(['Auth', 'Muammolar', 'Ovoz', 'Chat', 'Admin: moderatsiya', 'Tizim']));
  });

  it('har endpoint uchun: rol, kirish maydonlari, javob va xatolar hujjatlangan', () => {
    const vote = doc.paths['/issues/{id}/vote']!['put']!;
    expect(vote.description).toContain('**Rol:** aholi');
    expect(vote.security).toEqual([{ bearerAuth: [] }, { cookieAuth: [] }]);
    // Biznes xatolari kod va o'zbekcha xabar bilan
    expect(vote.responses['409']!.description).toContain('**VOTE_LIMIT_REACHED** — Bu oy uchun 3 ta ovozingizdan foydalandingiz');
    expect(vote.responses['409']!.description).toContain('ROUND_CLOSED');
    expect(Object.keys(vote.responses['409']!.content!['application/json']!.examples!)).toEqual(expect.arrayContaining(['VOTE_LIMIT_REACHED', 'ROUND_CLOSED', 'ISSUE_NOT_VOTABLE']));
    expect(vote.responses['401']).toBeTruthy();
    expect(vote.responses['404']).toBeTruthy();

    const login = doc.paths['/auth/login']!['post']!;
    expect(login.security).toEqual([]);
    expect(Object.keys(login.requestBody!.content['application/json']!.examples!)).toEqual(['aholi', 'admin', 'veb', 'birinchi']);
    expect(login.responses['429']!.description).toContain('TOO_MANY_ATTEMPTS');

    const transition = doc.paths['/admin/issues/{id}/transition']!['post']!;
    expect(transition.description).toContain('**Rol:** mahalla admini');
    expect(Object.keys(transition.requestBody!.content['application/json']!.examples!)).toEqual(['jarayon', 'yuborildi', 'hal', 'qayta']);
    expect(transition.responses['409']!.description).toContain('INVALID_STATUS_TRANSITION');

    const create = doc.paths['/issues']!['post']!;
    expect(create.description).toContain('Tezlik chegarasi');
  });

  it("haqiqiy javob misollari: ko'p endpointda bor va sxemalarga mos", () => {
    const keys = Object.keys(examples);
    expect(keys.length).toBeGreaterThan(40);
    for (const key of keys) {
      const schema = responseSchemas[key] as z.ZodType | undefined;
      if (!schema) continue;
      const r = schema.safeParse(examples[key]);
      expect(r.success, `${key}: ${r.success ? '' : JSON.stringify(r.error.issues.slice(0, 2))}`).toBe(true);
    }
    const lamp = doc.paths['/issues/{id}']!['get']!.responses['200']!.content!['application/json']!.example as { history: unknown[]; media: unknown[] };
    expect(lamp.history.length).toBeGreaterThan(0);
    // Maxfiy narsa yo'q: token va vaqtinchalik parol almashtirilgan
    expect(JSON.stringify(examples)).not.toMatch(/"token":"(?!Zk3QXw0hY1mJb7pS4nVd8eAcF2uLgT9rKiOyWq5Ni_M)/);
    expect(JSON.stringify(examples)).not.toContain('http://127.0.0.1');
  });

  it("production'da ham ochiq (mobil/admin uchun); API_DOCS=false bilan yopiladi", async () => {
    const prod = await createTestApp({ NODE_ENV: 'production', STORAGE_SIGNING_SECRET: 'prod-secret' });
    const off = await createTestApp({ API_DOCS: 'false' });
    try {
      expect((await prod.req('GET', '/api/openapi.json')).status).toBe(200);
      expect((await fetch(`${prod.base}/api/docs`)).status).toBe(200);
      expect((await off.req('GET', '/api/openapi.json')).status).toBe(404);
      expect((await fetch(`${off.base}/api/docs`)).status).toBe(404);
    } finally {
      await prod.close();
      await off.close();
    }
  });
});
