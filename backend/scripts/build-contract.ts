/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from 'node:fs';
import type { AddressInfo } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../src/app';
import { seedDemo } from '../src/cli/seed-demo';
import { loadEnv } from '../src/config/env';
import { buildContract, examples as storedExamples, FILE_SERVERS } from '../src/contract';
import { systemClock } from '../src/core/clock';
import { createDb } from '../src/core/db';
import { noopJobs, noopRealtime, type Deps } from '../src/core/deps';
import { MemoryKv } from '../src/core/kv';
import { createLogger } from '../src/core/logger';
import { migrate } from '../src/core/migrate';
import { createStorage } from '../src/core/storage';
import { toYaml } from '../src/core/yaml';
import { allRoutes } from '../src/routes';

const EXAMPLES_FILE = path.resolve('src/contract/response-examples.json');
const PASSWORD = 'Demo12345!';

/**
 * Haqiqiy javob misollari: xotiradagi bazaga demo ma'lumot solinadi, ilova ishga tushiriladi va asosiy endpointlar
 * chaqiriladi. Natijalar OpenAPI'ga `example` sifatida yoziladi (Swagger'da va Prism mock'da ko'rinadi).
 */
async function generateExamples(): Promise<Record<string, unknown>> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mhd-contract-'));
  const env = loadEnv({
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
    STORAGE_DIR: dir,
    STORAGE_SIGNING_SECRET: 'contract',
    PUBLIC_API_URL: 'http://localhost:3000',
    LOGIN_IP_LIMIT: '100000',
    API_RATE_LIMIT: '100000',
    WEB_ORIGINS: 'http://localhost:3001',
  });
  const db = await createDb({ url: 'memory://' });
  await migrate(db);
  const deps: Deps = { env, db, kv: new MemoryKv(), storage: createStorage(env), clock: systemClock, log: createLogger(env), realtime: noopRealtime, jobs: noopJobs };

  const log = console.log;
  console.log = () => undefined;
  await seedDemo(deps);
  console.log = log;

  const server = createApp(deps).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const out: Record<string, unknown> = {};

  async function call(key: string, method: string, url: string, token?: string, body?: unknown, headers: Record<string, string> = {}): Promise<any> {
    const res = await fetch(`${base}/api/v1${url}`, {
      method,
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    const json = text ? JSON.parse(text) : undefined;
    if (!res.ok) {
      console.warn(`  ! ${key || `${method} ${url}`}: ${res.status} ${text.slice(0, 110)}`);
      return undefined;
    }
    if (key && json !== undefined && !(key in out)) out[key] = json;
    return json;
  }
  const login = (user: string, key = '') =>
    call(key, 'POST', '/auth/login', undefined, { login: user, password: PASSWORD, client: 'mobile' });

  try {
    const ali = (await login('ali.yunusobod', 'POST /auth/login'))?.token as string;
    const vali = (await login('vali.yunusobod'))?.token as string;
    const admin = (await login('admin.yunusobod'))?.token as string;

    // ---- aholi: o'qish
    await call('GET /me', 'GET', '/me', ali);
    await call('GET /home', 'GET', '/home', ali);
    await call('GET /categories', 'GET', '/categories', ali);
    const feed = await call('GET /issues', 'GET', '/issues?sort=top&period=current', ali);
    const lamp = feed.items[0];
    await call('GET /issues/mine', 'GET', '/issues/mine', ali);
    const detail = await call('GET /issues/:id', 'GET', `/issues/${lamp.id}`, ali);
    await call('GET /issues/:id/comments', 'GET', `/issues/${lamp.id}/comments`, ali);
    if (detail?.media?.[0]) await call('GET /media/:id/url', 'GET', `/media/${detail.media[0].id}/url`, ali);
    await call('GET /rounds/current', 'GET', '/rounds/current', ali);
    const rounds = await call('GET /rounds', 'GET', '/rounds', ali);
    const closed = rounds?.items?.find((r: any) => r.winner);
    if (closed) await call('GET /rounds/:id/result', 'GET', `/rounds/${closed.id}/result`, ali);
    const chat = await call('GET /chat/messages', 'GET', '/chat/messages?limit=10', ali);
    const events = await call('GET /events', 'GET', '/events?scope=upcoming', ali);
    const ev = events?.items?.[0];
    if (ev) await call('GET /events/:id', 'GET', `/events/${ev.id}`, ali);
    const anns = await call('GET /announcements', 'GET', '/announcements', ali);
    if (anns?.items?.[0]) await call('GET /announcements/:id', 'GET', `/announcements/${anns.items[0].id}`, ali);
    await call('GET /notifications', 'GET', '/notifications', ali);
    await call('GET /notifications/unread-count', 'GET', '/notifications/unread-count', ali);

    // ---- aholi: yozish
    const notVoted = feed.items.find((i: any) => !i.myVote);
    if (notVoted) await call('PUT /issues/:id/vote', 'PUT', `/issues/${notVoted.id}/vote`, ali);
    await call('POST /chat/messages', 'POST', '/chat/messages', ali, { text: "Assalomu alaykum, qo'shnilar!", clientMessageId: `contract-${Date.now()}-0001` });
    // ---- aholi <-> admin shaxsiy chat
    await call('POST /support/messages', 'POST', '/support/messages', ali, { text: 'Assalomu alaykum, hovlidagi chiroq yonmayapti', clientMessageId: `contract-support-${Date.now()}-0001` });
    await call('GET /support/messages', 'GET', '/support/messages?limit=10', ali);
    const threads = await call('GET /admin/support/threads', 'GET', '/admin/support/threads', admin);
    const thread = threads?.items?.[0];
    if (thread) {
      await call('POST /admin/support/threads/:residentId/messages', 'POST', `/admin/support/threads/${thread.residentId}/messages`, admin, { text: "Salom! Ertaga ko'rib chiqamiz", clientMessageId: `contract-support-${Date.now()}-0002` });
      await call('GET /admin/support/threads/:residentId/messages', 'GET', `/admin/support/threads/${thread.residentId}/messages?limit=10`, admin);
    }
    const comment = await call('POST /issues/:id/comments', 'POST', `/issues/${lamp.id}/comments`, ali, { text: "Men ham har kuni shu yerdan o'taman" });
    const foreign = chat?.items?.find((m: any) => !m.mine);
    if (foreign) await call('POST /reports', 'POST', '/reports', ali, { targetType: 'CHAT_MESSAGE', targetId: foreign.id, reason: 'Reklama xarakteridagi xabar' });
    if (ev) await call('PUT /events/:id/rsvp', 'PUT', `/events/${ev.id}/rsvp`, ali);
    const created = await call('POST /issues', 'POST', '/issues', ali, { title: "Yo'l chetida axlat to'planib qolgan", description: "Maktab yo'lagidagi axlat haftalardan beri olib ketilmayapti", category: 'WASTE', locationText: "Maktab yo'lagi", mediaIds: [] }, { 'Idempotency-Key': `contract-${Date.now()}` });
    await call('PATCH /issues/:id', 'PATCH', `/issues/${created.id}`, ali, { title: "Yo'l chetida axlat to'planib qolgan (aniqlandi)" });

    // ---- admin: o'qish
    await call('GET /admin/dashboard', 'GET', '/admin/dashboard', admin);
    const queue = await call('GET /admin/moderation/queue', 'GET', '/admin/moderation/queue', admin);
    await call('GET /admin/issues', 'GET', '/admin/issues', admin);
    await call('GET /admin/issues/:id', 'GET', `/admin/issues/${lamp.id}`, admin);
    const residents = await call('GET /admin/residents', 'GET', '/admin/residents', admin);
    await call('GET /admin/residents/:id', 'GET', `/admin/residents/${residents.items[0].id}`, admin);
    await call('GET /admin/reports', 'GET', '/admin/reports', admin);
    await call('GET /admin/events', 'GET', '/admin/events', admin);
    if (ev) await call('GET /admin/events/:id/attendees', 'GET', `/admin/events/${ev.id}/attendees`, admin);
    const adminRounds = await call('GET /admin/rounds', 'GET', '/admin/rounds', admin);
    const adminClosed = adminRounds?.items?.find((r: any) => r.winner);
    if (adminClosed) await call('GET /admin/rounds/:id/result', 'GET', `/admin/rounds/${adminClosed.id}/result`, admin);

    // ---- admin: moderatsiya va ish yuritish
    const pending = queue.items.filter((i: any) => i.id !== created.id);
    if (pending[0]) await call('POST /admin/issues/:id/approve', 'POST', `/admin/issues/${pending[0].id}/approve`, admin);
    if (pending[1]) await call('POST /admin/issues/:id/reject', 'POST', `/admin/issues/${pending[1].id}/reject`, admin, { reason: "Aniq manzil ko'rsatilmagan" });
    await call('POST /admin/issues/:id/merge', 'POST', `/admin/issues/${created.id}/merge`, admin, { targetIssueId: lamp.id });
    const selected = await call('', 'GET', '/admin/issues?status=SELECTED', admin);
    if (selected?.items?.[0]) {
      const id = selected.items[0].id;
      await call('POST /admin/issues/:id/transition', 'POST', `/admin/issues/${id}/transition`, admin, { toStatus: 'IN_PROGRESS', responsible: 'Elektr tarmoqlari xodimi Karimov', nextStep: 'Yangi lampochka olib kelish', dueDate: '2026-12-10' });
      await call('PATCH /admin/issues/:id/work', 'PATCH', `/admin/issues/${id}/work`, admin, { responsible: 'Vali Aliyev', dueDate: '2026-12-15', reason: "Mas'ul almashdi" });
    }
    const open = await call('', 'GET', '/admin/issues?status=OPEN', admin);
    const stale = open?.items?.find((i: any) => i.voteCount === null);
    if (stale) await call('POST /admin/issues/:id/carry-over', 'POST', `/admin/issues/${stale.id}/carry-over`, admin);
    const reports = await call('', 'GET', '/admin/reports?status=OPEN', admin);
    if (reports?.items?.[0]) await call('POST /admin/reports/:id/hide', 'POST', `/admin/reports/${reports.items[0].id}/hide`, admin, { reason: 'Qoidabuzarlik' });
    const sara = chat?.items?.find((m: any) => !m.mine && m.id !== foreign?.id);
    if (sara) {
      const r = await call('', 'POST', '/reports', vali, { targetType: 'CHAT_MESSAGE', targetId: sara.id, reason: 'Shubhali xabar' });
      if (r) await call('POST /admin/reports/:id/dismiss', 'POST', `/admin/reports/${r.id}/dismiss`, admin, { reason: 'Asossiz' });
    }
    if (comment) await call('', 'POST', `/admin/content/comment/${comment.id}/hide`, admin, { reason: 'Nomaqbul kontent' });

    // ---- admin: aholi, tadbir, e'lon, audit
    const fresh = await call('POST /admin/residents', 'POST', '/admin/residents', admin, { displayName: 'Ali Valiyev', login: 'ali.valiyev', phone: '+998901234567' });
    if (fresh) {
      await call('POST /admin/residents/:id/reset-password', 'POST', `/admin/residents/${fresh.user.id}/reset-password`, admin);
      await call('POST /admin/residents/:id/block', 'POST', `/admin/residents/${fresh.user.id}/block`, admin, { reason: 'Qoidabuzarlik' });
      await call('POST /admin/residents/:id/unblock', 'POST', `/admin/residents/${fresh.user.id}/unblock`, admin);
    }
    const mkEvent = (title: string) => call('POST /admin/events', 'POST', '/admin/events', admin, { title, description: 'Mahalla hovlisini birgalikda tozalaymiz', startsAt: new Date(Date.now() + 9 * 86400_000).toISOString(), location: 'Markaziy hovli', organizer: 'Mahalla qo‘mitasi' });
    const e1 = await mkEvent('Hashar: hovli tozalash');
    if (e1) {
      await call('POST /admin/events/:id/publish', 'POST', `/admin/events/${e1.id}/publish`, admin);
      await call('PATCH /admin/events/:id', 'PATCH', `/admin/events/${e1.id}`, admin, { startsAt: new Date(Date.now() + 10 * 86400_000).toISOString() });
      await call('POST /admin/events/:id/cancel', 'POST', `/admin/events/${e1.id}/cancel`, admin, { reason: 'Ob-havo yomon' });
    }
    const e2 = await mkEvent('Daraxt ekish');
    if (e2) {
      await call('', 'POST', `/admin/events/${e2.id}/publish`, admin);
      await call('POST /admin/events/:id/complete', 'POST', `/admin/events/${e2.id}/complete`, admin, { resultText: '25 kishi qatnashdi, 40 ta ko‘chat o‘tkazildi' });
    }
    const ann = await call('POST /admin/announcements', 'POST', '/admin/announcements', admin, { title: "Ertaga suv o'chadi", body: "Ertaga soat 9 dan 14 gacha suv o'chiriladi", isImportant: true });
    if (ann) {
      await call('PATCH /admin/announcements/:id', 'PATCH', `/admin/announcements/${ann.id}`, admin, { title: "Ertaga suv o'chadi (yangilandi)" });
      await call('POST /admin/announcements/:id/publish', 'POST', `/admin/announcements/${ann.id}/publish`, admin);
    }
    await call('GET /admin/audit', 'GET', '/admin/audit', admin);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await db.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }

  // Maxfiy/o'zgaruvchan qiymatlarni almashtirish
  const text = JSON.stringify(out)
    .replaceAll(base, 'http://localhost:3000')
    .replace(/"token":"[^"]+"/g, '"token":"Zk3QXw0hY1mJb7pS4nVd8eAcF2uLgT9rKiOyWq5Ni_M"')
    .replace(/"temporaryPassword":"[^"]+"/g, '"temporaryPassword":"Hn4Rk8Tm3Q"');
  return JSON.parse(text) as Record<string, unknown>;
}

async function main(): Promise<void> {
  const examples = process.env['SKIP_EXAMPLES'] ? storedExamples : await generateExamples();
  if (!process.env['SKIP_EXAMPLES']) {
    fs.writeFileSync(EXAMPLES_FILE, `${JSON.stringify(examples, null, 2)}\n`);
  }

  // 1) OpenAPI shartnomasi: backend/openapi.yaml (frontend/mobil tiplarni va Prism mock'ni shundan oladi)
  const doc = buildContract(FILE_SERVERS, examples);
  fs.writeFileSync(
    path.resolve('openapi.yaml'),
    `# Avtomatik generatsiya: \`pnpm contract:build\` (marshrutlar + zod sxemalar + haqiqiy javob misollari). Qo'lda tahrirlamang.\n${toYaml(doc)}\n`,
  );

  // 2) Endpointlar jadvali: docs/ENDPOINTS.md
  const ROLE: Record<string, string> = { public: 'ochiq', user: 'har qanday kirgan', resident: 'aholi', admin: 'admin' };
  const byTag = new Map<string, typeof allRoutes>();
  for (const r of allRoutes) byTag.set(r.tag, [...(byTag.get(r.tag) ?? []), r]);
  const lines = [
    '# Endpointlar',
    '',
    "Avtomatik generatsiya: `pnpm contract:build` (qo'lda tahrirlamang). Prefiks: `/api/v1`. To'liq sxemalar va misollar — `backend/openapi.yaml`, jonli Swagger — `http://localhost:3000/api/docs` (dev).",
    '',
    '`/health` (liveness) va `/ready` (DB, kesh, saqlash holati) — prefikssiz.',
  ];
  for (const [tag, routes] of byTag) {
    lines.push('', `## ${tag}`, '', "| Metod | Yo'l | Kim | Tavsif |", '| --- | --- | --- | --- |');
    for (const r of routes) {
      lines.push(`| \`${r.method.toUpperCase()}\` | \`${r.path}\` | ${ROLE[r.auth]} | ${r.summary.replace(/\|/g, '\\|')} |`);
    }
  }
  const docsDir = path.resolve('..', 'docs');
  fs.mkdirSync(docsDir, { recursive: true });
  fs.writeFileSync(path.join(docsDir, 'ENDPOINTS.md'), `${lines.join('\n')}\n`);

  const have = Object.keys(examples).length;
  console.log(`openapi.yaml va docs/ENDPOINTS.md yozildi: ${allRoutes.length} ta endpoint, ${have} ta haqiqiy javob misoli`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
