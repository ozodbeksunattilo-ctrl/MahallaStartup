# Frontend va mobil uchun qo'llanma

Backend egasi shu faylni yangilab boradi. **To'liq endpointlar** — [ENDPOINTS.md](ENDPOINTS.md), **sxemalar** — `backend/openapi.yaml`
(avtomatik generatsiya), jonli hujjat — `http://localhost:3000/api/docs` (dev).

```bash
cd backend && pnpm db:seed:demo && pnpm dev          # API (hech narsa o'rnatmasdan)
cd frontend && pnpm api:types                        # lib/api-schema.d.ts (openapi-typescript)
cd backend  && pnpm contract:mock                    # Prism mock :4010 (backend o'rniga)
```

Demo akkauntlar (`pnpm db:seed:demo`): `admin.yunusobod`, `ali.yunusobod`, `vali.yunusobod`, `sara.yunusobod` — parol `Demo12345!`;
`dilnoza.yunusobod` — `Temp12345!` (birinchi kirish: parolni almashtirish majburiy). Xuddi shunday `…chilonzor` (boshqa mahalla).

## Manzillar

| Muhit | API |
| --- | --- |
| Brauzer (frontend) | `/api/v1/*` — Next.js `rewrites` orqali API'ga proksi (bitta origin, CORS yo'q) |
| iOS simulyator | `http://localhost:3000` |
| Android emulyator | `http://10.0.2.2:3000` (`mobile/src/lib/config.ts` avtomatik almashtiradi) |
| Real qurilma | `http://<kompyuter-LAN-IP>:3000`; backend `HOST=0.0.0.0` (standart) |

Rasm/video URL'lari (lokal saqlash) so'rov kelgan host'ga qaratiladi — emulyator va qurilmada ham ochiladi.

## Autentifikatsiya

- Login — admin bergan username (kichik harf). Vaqtinchalik parol (72 soat) bilan kirilsa `mustChangePassword: true`.
- `mustChangePassword` paytida faqat `GET /me`, `POST /auth/change-password`, `POST /auth/logout` ishlaydi, qolgani `403 PASSWORD_CHANGE_REQUIRED`.
- **Mobil**: `POST /auth/login { login, password, client: "mobile" }` → `{ token, user, mustChangePassword }`. Keyin `Authorization: Bearer <token>` (30 kun, sliding). Token `expo-secure-store` da (`mobile/src/lib/token.ts`).
- **Veb**: `client: "web"` → `Set-Cookie: mhd_session` (HttpOnly, 12 soat sliding) + `mhd_csrf`. O'zgartiruvchi so'rovlarda `X-CSRF-Token` = `mhd_csrf` cookie qiymati, `Origin` `WEB_ORIGINS` ichida bo'lishi shart (`frontend/lib/api.ts` buni qiladi).
- 401 `UNAUTHENTICATED` → login ekraniga. 429 `TOO_MANY_ATTEMPTS` → «15 daqiqadan keyin urinib ko'ring» (`Retry-After`).
- Login uchun IP bo'yicha 20/10 daq; umumiy 300 so'rov/daq/foydalanuvchi; post yaratish 10/soat, chat 30/daq, izoh 30/daq, shikoyat 20/soat.

## Xato formati (hamma joyda)

```json
{ "error": { "code": "VOTE_LIMIT_REACHED", "message": "Bu oy uchun 3 ta ovozingizdan foydalandingiz", "details": {} } }
```

`code` barqaror, `message` o'zbek lotin (to'g'ridan-to'g'ri ko'rsatsa bo'ladi). Validatsiya: `400 VALIDATION_ERROR`, `details.fields = { "title": "5–120 belgi bo'lsin" }`. Kodlar jadvali — root `README.md`.

## Pagination va tartib

`?cursor=&limit=` (standart 20, ko'pi 50) → `{ items, nextCursor }`; `nextCursor === null` — tugagan. Chat — istisno: `before`/`after` = xabar ID'si.
Lentada `sort=newest|top`, `period=current` (faqat joriy davrdagilar), `category`, `status`.

## Idempotentlik

| So'rov | Kalit |
| --- | --- |
| `POST /issues` | `Idempotency-Key` header (majburiy, 8–100 belgi). Qayta yuborish o'sha postni qaytaradi (200 o'rniga 201) |
| `POST /media` | `clientUploadId` (multipart maydon, UUID) |
| `POST /chat/messages` | `clientMessageId` (8–100 belgi); javobdagi `id/createdAt` = «yuborildi» |
| `PUT/DELETE /issues/:id/vote`, `/follow`, `/events/:id/rsvp` | tabiatan idempotent |

Mobil `newKey()` (`mobile/src/lib/api.ts`) kalit hosil qiladi.

## Media

1. `POST /media` (multipart: `file`, `clientUploadId`) → `{ mediaId, kind, width, height, sizeBytes }`.
2. `POST /issues { mediaIds: [...] }` (≤ 3 rasm, ≤ 1 video; o'zingiznikiga ham, hali ishlatilmaganiga ham).

- Rasm: **JPEG yuboring** (iOS HEIC → `expo-image-manipulator` bilan JPEG; HEIC `415`). PNG/WebP ham qabul. 5 MB gacha (`413`). Server EXIF/GPS'ni o'chiradi, 2048 px ga kichraytiradi, 480 px thumbnail yaratadi.
- Video: MP4/QuickTime, 25 MB gacha; klientda ~60 s bilan cheklang. Metadata tozalanmaydi (keyingi bosqich).
- O'qish: javobdagi `url`/`thumbUrl` **5 daqiqa** amal qiladi (post/tadbir/tarix javoblarida har safar yangisi). Keshlab qo'ymang; kerak bo'lsa `GET /media/:id/url`.
- Yashirilgan post media'si oddiy foydalanuvchiga (muallifga ham) berilmaydi.

## Ovoz berish

- `GET /rounds/current` → `votesUsed/votesLeft/myVotes`; `PUT /issues/:id/vote` (200, idempotent), `DELETE` (204).
- Xatolar: `ROUND_CLOSED`, `ISSUE_NOT_VOTABLE`, `VOTE_LIMIT_REACHED`. Post javobida `canVote`, `myVote`, `voteCount`, `statusLabel` («Ovoz berilmoqda»).
- Oy yakuni avtomatik (har 5 daq tekshiriladi); natija `GET /rounds/:id/result`, g'olib `SELECTED` bo'ladi.

## Socket.IO (chat)

`io(API_URL + '/chat', { auth: { token } })` (mobil) yoki cookie + `Origin` (veb). Server faqat tarqatadi: `message:new` (xabar obyekti), `message:hidden` (`{ id }`). Xabar yuborish — REST. Uzilishdan keyin `GET /chat/messages?after=<oxirgi id>`. Xona serverda sessiyadan aniqlanadi.

## Push

`PUT /devices { expoPushToken, platform }`. Push `data`: `{ notificationId, type, entityType, entityId }`.

| `entityType` | Deep link (mobil) |
| --- | --- |
| `ISSUE` | `/issues/:id` |
| `EVENT` | `/events/:id` |
| `ANNOUNCEMENT` | `/announcements/:id` |
| `ROUND` | `/rounds/:id` |

Turlar: `ISSUE_STATUS_CHANGED`, `ISSUE_REJECTED`, `ROUND_WINNER`, `FOLLOWED_ISSUE_UPDATE`, `AUTHOR_FEEDBACK` (admin), `EVENT_UPDATED`, `EVENT_CANCELLED`, `EVENT_REMINDER`, `IMPORTANT_ANNOUNCEMENT`.
Server `EXPO_ACCESS_TOKEN` bo'lsa yuboradi; bo'lmasa faqat ichki ro'yxat (`GET /notifications`) ishlaydi.

## Sahifalar va ekranlar xaritasi

Mobil ekran fayllarining tepasida `// API:` sharhi — qaysi endpointlarga ulanishi kerakligi.

**Frontend** (`frontend/app`, API'ga ulangan): `/login`, `/change-password`, `/` (dashboard), `/moderation`, `/issues`, `/issues/[id]`,
`/rounds`, `/residents`, `/reports`, `/events`, `/announcements`, `/audit`. Yaratish, tahrirlash, rad etish va holat o'tishlari shu
sahifalardagi dialoglarda bajariladi.

**Mobil** (`mobile/app`): `login`, `change-password`, tablar `(tabs)/{index,feed,vote,chat,profile}`, `issues/{new,mine,[id],[id]/edit}`,
`rounds/{index,[id]}`, `events/{index,[id]}`, `announcements/{index,[id]}`, `notifications`.
