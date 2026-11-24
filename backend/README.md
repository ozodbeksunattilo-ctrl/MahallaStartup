# Backend (Express 5 + PostgreSQL)

Mahalladosh API. **Hech narsa o'rnatmasdan** ishga tushadi: ichki Postgres (PGlite), xotiradagi kesh va lokal fayl saqlash.
Production/jamoa uchun haqiqiy Postgres, Redis va S3'ni `.env` orqali ulang.

```bash
cp .env.example .env
pnpm install
pnpm db:seed:demo      # ixtiyoriy: 2 ta demo mahalla (akkauntlar jadvali chiqadi)
pnpm dev               # http://localhost:3000  ·  Swagger: /api/docs  ·  /health  ·  /ready
```

## Rejimlar

| Servis | Lokal (standart) | Production / jamoa |
| --- | --- | --- |
| Ma'lumotlar bazasi | `DATABASE_URL` bo'sh → PGlite, fayl `./data/pglite` | `DATABASE_URL=postgresql://...` (Postgres 16, `pg` pool, `DATABASE_POOL_MAX`) |
| Kesh / rate limit / sessiya keshi | xotirada (bitta jarayon) | `REDIS_URL=redis://...` |
| Media | `./data/media`, HMAC imzoli muddatli URL | `S3_ENDPOINT` + kalitlar (private bucket, presigned GET) |
| Socket.IO | bitta jarayon | `REDIS_URL` bo'lsa Redis adapter |

`GET /health` — jarayon tirik; `GET /ready` — `db`, `cache`, `storage` alohida holati (kamida bittasi yiqilsa 503).
PGlite fayli bir vaqtda faqat bitta jarayonda ochiladi (qulf-fayl): server ishlayotganda seed ishlamaydi — avval seed, keyin server.

## Buyruqlar

| Buyruq | Vazifa |
| --- | --- |
| `pnpm dev` | `tsx watch` bilan server |
| `pnpm build && pnpm start` | `dist/` ga yig'ish va ishga tushirish |
| `pnpm typecheck` · `pnpm lint` · `pnpm test` | tekshiruvlar (testlar hech narsa o'rnatishni talab qilmaydi) |
| `pnpm db:migrate` | migratsiyalar (server ham boshlanishda avtomatik bajaradi) |
| `pnpm db:seed:demo` | demo ma'lumotlar (faqat `demo-` slug'li mahallalar qayta yaratiladi) |
| `pnpm cli mahalla:create --name "Yunusobod" --slug yunusobod --admin-login admin.yunusobod --admin-name "Ali Valiyev"` | platforma operatori: mahalla + admin, vaqtinchalik parol bir marta chiqadi |
| `pnpm cli round:close --mahalla demo-yunusobod --period 2026-11 --now 2026-12-01T00:01:00+05:00` | davrni sinov uchun yopish (faqat lokal: `NODE_ENV != production` yoki `ALLOW_TIME_TRAVEL=true`) |
| `pnpm contract:build` | `openapi.yaml` + `docs/ENDPOINTS.md` ni marshrutlardan generatsiya qilish |
| `pnpm contract:mock` | Prism mock `:4010` |
| `pnpm bench` | yuklama o'lchovi (ishlayotgan serverga qarshi) |

Haqiqiy Postgres'da testlash: `TEST_DATABASE_URL=postgresql://... pnpm test` (jadvallar TRUNCATE qilinadi — alohida baza ishlating).

## Tuzilma

```
src/
  server.ts, app.ts          ishga tushirish, Express ilovasi (testlar ham createApp(deps) ishlatadi)
  config/env.ts              zod bilan muhit o'zgaruvchilari
  core/
    http.ts                  route() — deklarativ marshrut: auth, rol, CSRF, rate limit, zod validatsiya, javob
    db.ts · kv.ts · storage.ts   pg|PGlite, Redis|xotira, S3|lokal — bitta interfeys
    openapi.ts · yaml.ts     marshrutlardan OpenAPI
    notify.ts · audit.ts · pagination.ts · password.ts · ids.ts (UUIDv7) · clock.ts
  middleware/                auth (Bearer/cookie, CSRF), rate-limit, xato formati
  modules/                   auth, residents, issues (holat mashinasi), rounds (ovoz/davr), media,
                             chat, moderation, events, announcements, notifications (+push), home, admin
  jobs/                      davr yopish, eslatmalar, fan-out, push, media tozalash
  realtime.ts                Socket.IO /chat
  cli/                       mahalla:create, round:close, db:migrate, seed-demo
db/migrations/               SQL migratsiyalar (CHECK, partial index shu yerda)
test/                        integratsiya testlari (haqiqiy SQL, xotiradagi PGlite)
```

Yangi endpoint: modul faylida `route({ method, path, auth, body, query, params, handler })` yozing va `src/routes.ts`
ro'yxatiga qo'shing (aniq yo'llar parametrlilardan oldin). `pnpm contract:build` hujjatni yangilaydi; `test/contract.spec.ts`
haqiqiy javoblarni `src/contract/responses.ts` sxemalari bilan solishtiradi.

## Muhim qoidalar (kodda qanday ta'minlangan)

- **Mahalla izolyatsiyasi**: `mahallaId` faqat sessiyadan; boshqa mahalla obyekti → 404 (`test/tenancy.spec.ts`).
- **Ovoz limiti lock'siz**: `UNIQUE(round, issue, voter)` + `UNIQUE(round, voter, slot)` + `CHECK(slot 1..3)`; `vote_count` bitta SQL'da atomik (`test/voting.spec.ts`: 20 parallel so'rov → aniq 3 ovoz).
- **Oy yakuni** idempotent (`FOR UPDATE` + `UNIQUE(round_id)`); tartib `votes DESC, publishedAt ASC, id ASC`; davr yopilgan paytdagi ko'rinish asos.
- **Holat mashinasi** bitta faylda: `src/modules/issues/status-machine.ts` (unit testlar barcha 8×8 juftlikni tekshiradi).
- **Bildirishnoma** `UNIQUE(user_id, dedupe_key)` + `ON CONFLICT DO NOTHING`; push faqat yangi qatorlar uchun.
- **Maxfiylik**: parol faqat Argon2id xeshi; sessiya tokeni DB'da SHA-256; audit/loglarda parol, token, push token yo'q (`redactSecrets`, pino redact — `test/audit.spec.ts`).

## O'lchovlar (lokal, PGlite, 10 parallel mijoz, seed bilan)

| Endpoint | p50 | p95 |
| --- | --- | --- |
| `GET /home` | 19 ms | 28 ms |
| `GET /issues` (lenta) | 37 ms | 55 ms |
| `GET /issues?sort=top` | 31 ms | 35 ms |
| `GET /issues/:id` | 38 ms | 48 ms |
| `PUT /issues/:id/vote` | 14 ms | 28 ms |
| `GET /chat/messages` | 10 ms | 18 ms |
| `POST /chat/messages` | 15 ms | 24 ms |

Maqsad p95 < 150 ms bajarildi. PGlite bitta ulanishli, haqiqiy Postgres'da raqamlar boshqacha bo'ladi — `pnpm bench` bilan qayta o'lchang.
`EXPLAIN ANALYZE` bilan indeks tekshiruvi haqiqiy Postgres'da bajarilmagan (qarang: asosiy README, «Tekshirilmaganlar»).

## Vercel'ga deploy (serverless)

`api/index.ts` + `vercel.json` — backend Vercel funksiyasi sifatida ishlaydi (Railway/Render shart emas).

1. Vercel → **Add New Project** → shu repo → **Root Directory: `backend`**, Framework: Other (build/output `vercel.json` dan olinadi).
2. Environment Variables: `NODE_ENV=production`, `DATABASE_URL` (Supabase **Session pooler**, `?uselibpqcompat=true&sslmode=require`),
   `DATABASE_POOL_MAX=5`, `STORAGE_SIGNING_SECRET` (tasodifiy), `TRUST_PROXY=1`, `STORAGE_DIR=/tmp/media`,
   `WEB_ORIGINS=https://<admin-panel>.vercel.app`, `PUBLIC_API_URL=https://<backend>.vercel.app`.
3. Migratsiya funksiyada bajarilmaydi: yangi migratsiya bo'lsa lokal `DATABASE_URL=... pnpm db:migrate`.
4. Region `icn1` (Seul) — Supabase `ap-northeast-2` ga yaqin.

Cheklovlar: Socket.IO yo'q (chat REST bilan, `?after=`); fon vazifalari (oy yakuni, e'lon tarqatish, eslatmalar)
so'rovlar ortidan bajariladi — trafik bo'lmasa kechikadi; `/tmp` dagi media nusxalar orasida yo'qolishi mumkin —
doimiy saqlash uchun Supabase Storage'ni `S3_*` orqali ulang. Swagger UI (`/api/docs`) Vercel'da tekshirilmagan.
