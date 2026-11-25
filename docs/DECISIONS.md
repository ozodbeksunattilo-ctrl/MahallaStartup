# Qabul qilingan qarorlar

Noaniq joylarda eng oqilona variant tanlanadi va shu yerga bir qatorda yoziladi.

| # | Qaror | Sabab |
| --- | --- | --- |
| 1 | Backend — **Express 5 + `pg` + zod**; NestJS va Prisma olib tashlandi | Buyurtmachi talabi (Express). Prisma 7 `generate` uchun dvigatel binarlarini internetdan tortadi — bu muhitda tarmoq beqaror edi; SQL migratsiyalar shaffof va CHECK/partial index/`FOR UPDATE`/CTE kabi imkoniyatlarga to'g'ridan-to'g'ri yaqin. |
| 2 | **Uchta mustaqil loyiha** (`backend/`, `frontend/`, `mobile/`), umumiy workspace yo'q | Har kim o'z papkasida ishlaydi: alohida `package.json`, lockfile, `.env`. Lockfile konfliktlari va Expo/Metro monorepo muammolari yo'q. |
| 3 | **Lokal rejim hech narsa o'rnatmasdan**: PGlite (ichki Postgres), xotiradagi kesh, lokal fayl saqlash | Jamoa mashinalarida Docker ishlamadi. `DATABASE_URL`/`REDIS_URL`/`S3_*` berilsa haqiqiy servislar ishlatiladi; kod bitta interfeys orqali ikkala rejimni qo'llaydi. Testlar ham shu bilan (xotiradagi PGlite = haqiqiy Postgres dvigateli). |
| 4 | Fon vazifalari **jarayon ichida** (BullMQ/Redis o'rniga) | Redis shart bo'lmasin. Ko'p nusxada ham xavfsiz: davr yopish `FOR UPDATE` + `UNIQUE(round_id)`, eslatma/fan-out unikal `dedupe_key`, push `FOR UPDATE SKIP LOCKED`. |
| 5 | Lokal saqlash: tekis kalitlar (`<uuid>.jpg`), HMAC imzoli URL, **asos URL so'rov host'idan** olinadi | Android emulyator (`10.0.2.2`), LAN va Next proksi uchun qo'shimcha sozlamasiz. S3 rejimida presigned GET (5 daq). |
| 6 | Shartnoma marshrutlar + zod'dan **avtomatik** generatsiya (`pnpm contract:build`) | Hujjat kodga mos qoladi; `test/contract.spec.ts` haqiqiy javoblarni sxemalar bilan tekshiradi. Faza 1 ning qo'lda yozilgan `openapi.yaml` i almashtirildi. |
| 7 | ID'lar ilovada **UUIDv7** (monoton), bildirishnomalar `gen_random_uuid()` | Cursor pagination va chatdagi `after=<id>` tartibga tayanadi; bildirishnoma ommaviy SQL bilan yaratiladi. |
| 8 | Ovoz: bo'sh slotni tanlab `INSERT ... ON CONFLICT DO NOTHING`, `vote_count` shu CTE'da; to'qnashuvda 5 martagacha qayta urinish | Lock'siz; limit DB cheklovlari bilan kafolatlanadi. |
| 9 | Admin ovoz bera olmaydi (403) | Ovoz beruvchi «faol RESIDENT a'zo» bo'lishi kerak (backend prompti). |
| 10 | `OPEN` holatdagi g'olib bo'lmagan post `IN_PROGRESS` ga o'tmaydi, faqat `SELECTED` orqali; carry-over faqat admin | Backend prompti. `/admin/issues/:id/transition` faqat `IN_PROGRESS`/`REFERRED`/`RESOLVED` ga o'tkazadi. |
| 11 | `REFERRED → IN_PROGRESS` va `RESOLVED → IN_PROGRESS` da mas'ul/qadam/muddat issue'dagi mavjud qiymatdan olinadi | Qayta so'ralmasin; `SELECTED → IN_PROGRESS` da mavjud qiymat yo'q, shuning uchun majburiy. |
| 12 | Davr chegarasi Toshkent UTC+5 qat'iy (DST yo'q) | `Mahalla.timezone` ustuni bor, lekin hisob `Asia/Tashkent` ga qattiq bog'langan (MVP). |
| 13 | Yashirish status emas — `hidden_at/hidden_reason/hidden_by_id`; muallif o'z yashirilgan postida faqat «yashirilgan» belgisini ko'radi (media URL'siz) | Backend prompti. |
| 14 | Takroriy `POST /issues` (Idempotency-Key) rate limit hisobiga ham kiradi | Oddiylik; 10/soat chegarasi qayta urinishlarni ham qamrab oladi. |
| 15 | Login bandligi `409 CONFLICT` + `details.fields.login`; bloklangan akkauntga login `403 FORBIDDEN` | Parol to'g'ri tekshirilgandan keyingina aniqlanadi (user enumeration yo'q). |
| 16 | Push receipt tekshiruvi xotirada | Redis shart emas; qayta ishga tushganda yo'qoladi (keyingi bosqich). |
| 17 | TypeScript **~6.0.3**, Node ≥ 20.12 (`process.loadEnvFile`) | Expo SDK 58 TS 6 ni talab qiladi; barcha loyihalarda bir xil. `types` standart `[]` — tsconfig'larda ochiq yozilgan. |
| 18 | Linter — oxlint, har loyihada o'z `.oxlintrc.json` | Eski Vite shabloni ham shuni ishlatgan. |
| 19 | Eski Vite shabloni `legacy/vite-template/` ga ko'chirildi; `frontend/` — Next.js 16 | O'chirishga ruxsat berilmagan edi. Backend promptida admin Next.js (`/api/*` rewrites). Vite kerak bo'lsa `legacy/` dan boshlash mumkin. |
| 20 | Holat yorliqlari TZ 4-bo'lim jadvaliga moslangan; muallif o'z postini avtomatik kuzatadi; g'olib bildirishnomasi tegishli postni ochadi | TZ (`MAHALLADOSH_TZ_CLAUDE.md`) sherik branch'idan olindi. |
| 21 | Frontend: auth guard (`proxy.ts`) hozircha yo'q; mobil: mock/SKIP_AUTH olib tashlandi | Mobil faqat haqiqiy backend bilan ishlaydi: ulanish yo'qligi «ishlayapti» bo'lib ko'rinmaydi. |
| 22 | **Haftalik ovoz davri oylik bilan parallel**: `voting_rounds.kind` (MONTHLY/WEEKLY), `issues.round_kind`; hafta — dushanba 00:00 dan (Toshkent), har davrda alohida 3 tadan ovoz; haftalik g'olibga avtomatik muddat (`due_date` = hafta tugashi + 7 kun) | Buyurtmachi talabi: tezkor muammolar 1 hafta ichida hal qilinsin. Muammo turini aholi yuborishda tanlaydi (standart — oylik). `/rounds/current` yuqori darajasi oylik (orqaga moslik), `weekly` — haftalik. |
| 23 | Mobil dizayn: «Qog'oz, yashil va terrakota» — Lora (sarlavha) + Onest (matn), tekis kartalar (1px chegara), gradient va rang-barang ikonkalar yo'q | Dizayn maketi (Bosh sahifa, Muammolar, Muammo, Kirish, Profil, Stil). Tokenlar `mobile/src/theme.ts` da. |
