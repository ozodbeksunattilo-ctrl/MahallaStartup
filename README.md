# Mahalladosh

Mahalla aholisi va adminlari uchun platforma: muammolarni yuborish, oylik ovoz berish, chat, tadbirlar, e'lonlar.

Uchta **alohida, mustaqil** loyiha — har biri o'z papkasida, o'z `package.json`, `node_modules` va `.env` bilan:

```
backend/    Express 5 + PostgreSQL — API (to'liq), CLI, migratsiyalar, testlar, openapi.yaml
frontend/   Next.js 16 admin veb-panel — backend API'ga to'liq ulangan
mobile/     Expo SDK 58 (Android/iOS) — skelet
docs/       DECISIONS.md, FOR_CLIENTS.md, ENDPOINTS.md
legacy/     Eski Vite shabloni (kerak emas, o'chirish mumkin)
```

## Tez boshlash — Docker va hech narsa o'rnatmasdan

```bash
cd backend
cp .env.example .env
pnpm install
pnpm db:seed:demo        # demo ma'lumotlar (akkauntlar jadvali chiqadi)
pnpm dev                 # API: http://localhost:3000 · Swagger: /api/docs
```

Lokal rejimda ichki Postgres (PGlite), xotiradagi kesh va lokal fayl saqlash ishlaydi. Production/jamoa uchun
`backend/.env` ga haqiqiy `DATABASE_URL` (Postgres), `REDIS_URL`, `S3_*` yozing — kod o'zgarmaydi
(Docker, Neon/Upstash/R2 yoki lokal o'rnatma; `backend/docker-compose.yml` ixtiyoriy). Tafsilot: [backend/README.md](backend/README.md).

```bash
cd frontend && cp .env.example .env && pnpm install && pnpm dev     # http://localhost:3001
cd mobile   && cp .env.example .env && pnpm install && pnpm start   # Expo
```

Ildizdagi qisqa buyruqlar: `pnpm install:all`, `pnpm dev:backend`, `pnpm dev:frontend`, `pnpm dev:mobile`.

### Demo akkauntlar (`pnpm db:seed:demo`)

| Mahalla | Login | Parol | Rol |
| --- | --- | --- | --- |
| `demo-yunusobod` / `demo-chilonzor` | `admin.yunusobod` / `admin.chilonzor` | `Demo12345!` | admin |
| | `ali.`, `vali.`, `sara.` + `yunusobod`/`chilonzor` | `Demo12345!` | aholi |
| | `dilnoza.yunusobod` / `dilnoza.chilonzor` | `Temp12345!` | aholi (birinchi kirish: parolni almashtirish majburiy) |

## Holat

| Qism | Holat |
| --- | --- |
| Backend: auth, sessiyalar, CSRF, rate limit, izolyatsiya | tayyor |
| Backend: post, media (EXIF tozalash), moderatsiya, merge, kuzatish, izohlar | tayyor |
| Backend: ovoz davrlari, 3 ovoz limiti, oy yakuni (idempotent), carry-over, CLI | tayyor |
| Backend: holat mashinasi, ish natijasi, muallif fikri | tayyor |
| Backend: bildirishnoma + push, chat (REST + Socket.IO), shikoyat, tadbir, e'lon, `/home`, dashboard, audit | tayyor |
| Backend: seed, bench, OpenAPI (avtomatik), testlar | tayyor (`pnpm test`: 13 fayl, 80 test) |
| Frontend (admin) | backendga ulangan: dashboard, moderatsiya, muammolar va holat o'tishlari, ovoz natijalari, aholi, tadbirlar, e'lonlar, shikoyatlar, audit (`pnpm test`: 4 test) |
| Mobil | skelet (shu bosqichda o'zgartirilmadi) |

75 ta endpoint: [docs/ENDPOINTS.md](docs/ENDPOINTS.md) · shartnoma: [backend/openapi.yaml](backend/openapi.yaml) ·
mijozlar uchun: [docs/FOR_CLIENTS.md](docs/FOR_CLIENTS.md) · qarorlar: [docs/DECISIONS.md](docs/DECISIONS.md).

## Tekshirilmaganlar (halol ro'yxat)

- **Haqiqiy PostgreSQL (`pg`) yo'li**: testlar PGlite'da (haqiqiy Postgres dvigateli, WASM) o'tdi; `pg` pool va haqiqiy parallel tranzaksiyalar bu muhitda sinalmadi (Docker ishlamadi). `TEST_DATABASE_URL=postgresql://... pnpm test` bilan sinab ko'ring. `EXPLAIN ANALYZE` ham haqiqiy Postgres'da bajarilmagan.
- **Redis** (`ioredis` keshi, rate limit, Socket.IO Redis adapter) va **S3/MinIO** (presigned URL) yo'llari — o'rnatilmagani uchun sinalmadi; lokal rejimdagi muqobillari testlangan.
- **Push**: Expo API testlarda soxtalashtirilgan (yuborish, `DeviceNotRegistered` tokenni o'chirish tekshirilgan); real qurilmada va `EXPO_ACCESS_TOKEN` bilan sinalmadi. Receipt tekshiruvi xotirada (qayta ishga tushganda yo'qoladi).
- **Video**: o'zgartirilmay saqlanadi — metadata (GPS) tozalash va transkodlash keyingi bosqich.
- **TZ**: `MAHALLADOSH_TZ_CLAUDE.md` (ildizda). Mobil skeletining pastki navigatsiyasi TZ dan farq qiladi (TZ: Bosh sahifa, Muammolar, Tadbirlar, Chat, Profil) — mobil dasturchi moslashtiradi. Mobil dizayn topshirig'i va tokenlar: [docs/design/README.md](docs/design/README.md).
- Frontend/mobil API'ga to'liq ulanmagan; mobilda `EXPO_PUBLIC_SKIP_AUTH=true` (ekranlarni ko'rish uchun).

## Xato kodlari

Format: `{ "error": { "code", "message", "details" } }`. `message` — o'zbek lotin; validatsiyada `details.fields`.

| Kod | HTTP | Ma'no |
| --- | --- | --- |
| `VALIDATION_ERROR` | 400 | So'rov maydonlari noto'g'ri (`details.fields`) |
| `UNAUTHENTICATED` | 401 | Sessiya yo'q yoki bekor qilingan |
| `INVALID_CREDENTIALS` | 401 | Login yoki parol noto'g'ri |
| `TEMP_PASSWORD_EXPIRED` | 401 | Vaqtinchalik parol muddati (72 soat) tugagan |
| `FORBIDDEN` | 403 | Rol yetarli emas / akkaunt bloklangan |
| `PASSWORD_CHANGE_REQUIRED` | 403 | Avval parolni almashtirish kerak |
| `CSRF_INVALID` | 403 | CSRF/Origin tekshiruvi o'tmadi (veb) |
| `NOT_FOUND` | 404 | Topilmadi (boshqa mahalla obyekti ham shunday) |
| `CONFLICT` | 409 | Umumiy ziddiyat (login band, noto'g'ri holat...) |
| `INVALID_STATUS_TRANSITION` | 409 | Holat mashinasi bu o'tishga ruxsat bermaydi |
| `ROUND_CLOSED` | 409 | Ovoz berish davri yopilgan |
| `ISSUE_NOT_VOTABLE` | 409 | Post ovoz berishga yaroqsiz |
| `VOTE_LIMIT_REACHED` | 409 | 3 ta ovoz ishlatilgan |
| `FILE_TOO_LARGE` | 413 | Rasm 5 MB, video 25 MB dan katta |
| `UNSUPPORTED_MEDIA_TYPE` | 415 | JPEG/PNG/WebP yoki MP4/QuickTime emas |
| `TOO_MANY_ATTEMPTS` | 429 | 5 ketma-ket xato login → 15 daq blok (`Retry-After`) |
| `RATE_LIMITED` | 429 | So'rovlar chegarasi oshdi (`Retry-After`) |
| `INTERNAL_ERROR` | 500 | Kutilmagan xato |
| `SERVICE_UNAVAILABLE` | 503 | Bog'liq xizmat ishlamayapti |
