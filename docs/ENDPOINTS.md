# Endpointlar

Avtomatik generatsiya: `pnpm contract:build` (qo'lda tahrirlamang). Prefiks: `/api/v1`. To'liq sxemalar va misollar — `backend/openapi.yaml`, jonli Swagger — `http://localhost:3000/api/docs` (dev).

`/health` (liveness) va `/ready` (DB, kesh, saqlash holati) — prefikssiz.

## Auth

| Metod | Yo'l | Kim | Tavsif |
| --- | --- | --- | --- |
| `POST` | `/auth/login` | ochiq | Kirish (mobil: Bearer token, veb: HttpOnly cookie) |
| `POST` | `/auth/logout` | har qanday kirgan | Chiqish (joriy sessiyani bekor qiladi) |
| `POST` | `/auth/change-password` | har qanday kirgan | Parolni almashtirish (joriy sessiyadan boshqalari bekor qilinadi) |
| `GET` | `/me` | har qanday kirgan | Joriy foydalanuvchi |
| `PUT` | `/devices` | har qanday kirgan | Push token'ni ro'yxatdan o'tkazish (idempotent) |
| `DELETE` | `/devices/:token` | har qanday kirgan | Push token'ni o'chirish |
| `GET` | `/auth/mahallas` | ochiq | Mahallalar ro'yxati (ro'yxatdan o'tish formasidagi tanlash uchun) |
| `POST` | `/auth/access-requests` | ochiq | Kirish so'rovi (mobil «Ro'yxatdan o'tish»; akkauntni mahalla admini beradi) |
| `GET` | `/auth/access-requests/:id` | ochiq | Kirish so'rovi holati (PENDING / APPROVED / REJECTED); shaxsiy ma'lumot qaytarilmaydi |

## Admin: kirish so'rovlari

| Metod | Yo'l | Kim | Tavsif |
| --- | --- | --- | --- |
| `GET` | `/admin/access-requests` | admin | Kirish so'rovlari ro'yxati |
| `POST` | `/admin/access-requests/:id/approve` | admin | So'rovni tasdiqlash: akkaunt yaratiladi, vaqtinchalik parol bir marta qaytadi |
| `POST` | `/admin/access-requests/:id/reject` | admin | So'rovni rad etish |

## Bosh sahifa

| Metod | Yo'l | Kim | Tavsif |
| --- | --- | --- | --- |
| `GET` | `/home` | har qanday kirgan | Mobil bosh sahifa: bitta so'rovda hammasi |

## Muammolar

| Metod | Yo'l | Kim | Tavsif |
| --- | --- | --- | --- |
| `GET` | `/categories` | har qanday kirgan | Toifalar (o'zbekcha nomlari bilan) |
| `GET` | `/issues/mine` | har qanday kirgan | Mening muammolarim (hamma holatda, rad sababi va dublikat bilan) |
| `GET` | `/issues` | har qanday kirgan | Muammolar lentasi |
| `POST` | `/issues` | aholi | Muammo yuborish (moderatsiyaga tushadi) |
| `GET` | `/issues/:id` | har qanday kirgan | Muammo sahifasi (media URL'lar 5 daqiqalik) |
| `PATCH` | `/issues/:id` | aholi | Tahrirlash (faqat muallif; PENDING_REVIEW / REJECTED holatda) |
| `POST` | `/issues/:id/resubmit` | aholi | Rad etilgan muammoni tahrirlab qayta yuborish (REJECTED -> PENDING_REVIEW) |
| `DELETE` | `/issues/:id` | aholi | O'chirish (soft delete; faqat PENDING_REVIEW / REJECTED) |
| `PUT` | `/issues/:id/follow` | har qanday kirgan | Kuzatish (idempotent) |
| `DELETE` | `/issues/:id/follow` | har qanday kirgan | Kuzatishni bekor qilish (idempotent) |
| `POST` | `/issues/:id/feedback` | aholi | Muallif fikri: yakundan keyin CONFIRMED yoki STILL_ONGOING (holat o'zgarmaydi) |
| `GET` | `/issues/:id/comments` | har qanday kirgan | Izohlar (eskisidan yangisiga) |
| `POST` | `/issues/:id/comments` | har qanday kirgan | Izoh qoldirish (OPEN va keyingi holatdagi ko'rinadigan postlarga) |

## Ovoz

| Metod | Yo'l | Kim | Tavsif |
| --- | --- | --- | --- |
| `GET` | `/rounds/current` | har qanday kirgan | Joriy davr, ishlatilgan/qolgan ovozlar va mening ovozlarim |
| `GET` | `/rounds` | har qanday kirgan | Davrlar ro'yxati (yangisidan eskisiga) |
| `GET` | `/rounds/:id/result` | har qanday kirgan | Davr natijasi: g'olib, reyting, ovoz berganlar soni |
| `PUT` | `/issues/:id/vote` | aholi | Ovoz berish (idempotent; 4-ovoz -> 409 VOTE_LIMIT_REACHED) |
| `DELETE` | `/issues/:id/vote` | aholi | Ovozni qaytarib olish (ovoz yo'q bo'lsa ham 204) |

## Admin: davrlar

| Metod | Yo'l | Kim | Tavsif |
| --- | --- | --- | --- |
| `GET` | `/admin/rounds` | admin | Davrlar ro'yxati |
| `GET` | `/admin/rounds/:id/result` | admin | Davr natijasi (g'olibni almashtirish endpointi ataylab YO'Q) |

## Media

| Metod | Yo'l | Kim | Tavsif |
| --- | --- | --- | --- |
| `POST` | `/media` | har qanday kirgan | Media yuklash (multipart: file + clientUploadId) |
| `GET` | `/media/:id/url` | har qanday kirgan | Media uchun 5 daqiqalik o'qish URL'i (ruxsat tekshiruvidan keyin) |

## Chat

| Metod | Yo'l | Kim | Tavsif |
| --- | --- | --- | --- |
| `GET` | `/chat/messages` | har qanday kirgan | Chat tarixi (mahallada bitta kanal) |
| `POST` | `/chat/messages` | har qanday kirgan | Xabar yuborish (idempotent: clientMessageId) |

## Support

| Metod | Yo'l | Kim | Tavsif |
| --- | --- | --- | --- |
| `GET` | `/support/messages` | aholi | Adminga yozilgan shaxsiy chat tarixi (aholining o'z suhbati) |
| `POST` | `/support/messages` | aholi | Adminga xabar yuborish (idempotent: clientMessageId) |

## Admin: support chat

| Metod | Yo'l | Kim | Tavsif |
| --- | --- | --- | --- |
| `GET` | `/admin/support/threads` | admin | Aholi suhbatlari ro'yxati (oxirgi xabar bo'yicha) |
| `GET` | `/admin/support/threads/:residentId/messages` | admin | Bitta aholi bilan suhbat tarixi |
| `POST` | `/admin/support/threads/:residentId/messages` | admin | Aholiga javob yozish |

## Shikoyatlar

| Metod | Yo'l | Kim | Tavsif |
| --- | --- | --- | --- |
| `POST` | `/reports` | aholi | Shikoyat qilish (POST \| COMMENT \| CHAT_MESSAGE); bir kontentga bitta shikoyat — takroriy so'rov 200 |

## Admin: moderatsiya

| Metod | Yo'l | Kim | Tavsif |
| --- | --- | --- | --- |
| `GET` | `/admin/reports` | admin | Shikoyatlar ro'yxati (kontent matni bilan) |
| `POST` | `/admin/reports/:id/hide` | admin | Shikoyat bo'yicha kontentni yashirish (sabab majburiy) |
| `POST` | `/admin/reports/:id/dismiss` | admin | Shikoyatni rad etish |
| `GET` | `/admin/moderation/queue` | admin | Moderatsiya navbati (PENDING_REVIEW, eskisi birinchi) |
| `POST` | `/admin/issues/:id/approve` | admin | Tasdiqlash: OPEN, nashr sanasi qo'yiladi, joriy davrga qo'shiladi |
| `POST` | `/admin/issues/:id/reject` | admin | Rad etish (sabab majburiy, muallifga ko'rinadi) |
| `POST` | `/admin/issues/:id/merge` | admin | Dublikat sifatida asosiy postga birlashtirish (muallif asosiy postni avtomatik kuzatadi) |
| `POST` | `/admin/content/:type/:id/hide` | admin | Kontentni yashirish (post \| comment \| chat_message; sabab majburiy) |
| `POST` | `/admin/content/:type/:id/unhide` | admin | Yashirilgan kontentni qaytarish |

## Tadbirlar

| Metod | Yo'l | Kim | Tavsif |
| --- | --- | --- | --- |
| `GET` | `/events` | har qanday kirgan | Tadbirlar: kelgusi (yaqini birinchi) yoki o'tgan |
| `GET` | `/events/:id` | har qanday kirgan | Tadbir (natija matni va fotolar bilan) |
| `PUT` | `/events/:id/rsvp` | aholi | Tadbirga yozilish (idempotent; faqat PUBLISHED va kelajakdagi tadbir) |
| `DELETE` | `/events/:id/rsvp` | aholi | Yozilishni bekor qilish (idempotent) |

## Admin: tadbirlar

| Metod | Yo'l | Kim | Tavsif |
| --- | --- | --- | --- |
| `GET` | `/admin/events` | admin | Barcha tadbirlar (qoralamalar bilan), yangisidan eskisiga |
| `POST` | `/admin/events` | admin | Tadbir yaratish (DRAFT) |
| `PATCH` | `/admin/events/:id` | admin | Tahrirlash. Vaqt/joy o'zgarsa yozilganlarga bildirishnoma (version oshadi) |
| `POST` | `/admin/events/:id/publish` | admin | Nashr qilish (idempotent) |
| `POST` | `/admin/events/:id/cancel` | admin | Bekor qilish (yozilganlarga bildirishnoma; idempotent) |
| `POST` | `/admin/events/:id/complete` | admin | Yakunlash: natija matni va foto (ixtiyoriy) |
| `GET` | `/admin/events/:id/attendees` | admin | Yozilganlar ro'yxati |

## E'lonlar

| Metod | Yo'l | Kim | Tavsif |
| --- | --- | --- | --- |
| `GET` | `/announcements` | har qanday kirgan | E'lonlar (admin qoralamalarni ham ko'radi) |
| `GET` | `/announcements/:id` | har qanday kirgan | E'lon |

## Admin: e'lonlar

| Metod | Yo'l | Kim | Tavsif |
| --- | --- | --- | --- |
| `POST` | `/admin/announcements` | admin | E'lon yaratish (DRAFT) |
| `PATCH` | `/admin/announcements/:id` | admin | E'lonni tahrirlash |
| `POST` | `/admin/announcements/:id/publish` | admin | Nashr qilish (idempotent). Muhim e'lon a'zolarga fon vazifasida (fan-out) bildirishnoma qiladi |
| `DELETE` | `/admin/announcements/:id` | admin | O'chirish (faqat qoralama) |

## Bildirishnomalar

| Metod | Yo'l | Kim | Tavsif |
| --- | --- | --- | --- |
| `GET` | `/notifications` | har qanday kirgan | Bildirishnomalar (yangisidan eskisiga) |
| `GET` | `/notifications/unread-count` | har qanday kirgan | O'qilmaganlar soni (qisman indeks bo'yicha) |
| `POST` | `/notifications/read-all` | har qanday kirgan | Hammasini o'qilgan deb belgilash |
| `POST` | `/notifications/:id/read` | har qanday kirgan | O'qilgan deb belgilash (idempotent) |

## Admin: aholi

| Metod | Yo'l | Kim | Tavsif |
| --- | --- | --- | --- |
| `GET` | `/admin/residents` | admin | Aholi ro'yxati |
| `GET` | `/admin/residents/:id` | admin | Aholi a'zosi |
| `POST` | `/admin/residents` | admin | Aholi akkaunti yaratish (vaqtinchalik parol bir marta qaytadi) |
| `POST` | `/admin/residents/:id/reset-password` | admin | Parolni tiklash (yangi vaqtinchalik parol, barcha sessiyalar bekor) |
| `POST` | `/admin/residents/:id/block` | admin | Bloklash (barcha sessiyalar darhol bekor) |
| `POST` | `/admin/residents/:id/unblock` | admin | Blokdan chiqarish |

## Admin: muammolar

| Metod | Yo'l | Kim | Tavsif |
| --- | --- | --- | --- |
| `GET` | `/admin/issues` | admin | Barcha muammolar (holat va muddati o'tganlar bo'yicha filtr) |
| `GET` | `/admin/issues/:id` | admin | Muammo (admin ko'rinishi: yashirilgan ham, tarix bilan) |
| `POST` | `/admin/issues/:id/transition` | admin | Holatni o'tkazish: IN_PROGRESS / REFERRED / RESOLVED (majburiy maydonlar holatga bog'liq) |
| `PATCH` | `/admin/issues/:id/work` | admin | Mas'ul/qadam/muddatni o'zgartirish (holat o'zgarmaydi; sabab majburiy, tarixga yoziladi) |
| `POST` | `/admin/issues/:id/carry-over` | admin | G'olib bo'lmagan ochiq muammoni joriy davrga 0 ovoz bilan o'tkazish |

## Admin

| Metod | Yo'l | Kim | Tavsif |
| --- | --- | --- | --- |
| `GET` | `/admin/dashboard` | admin | Bosh sahifa: faol ovoz beruvchilar, moderatsiya, muddati o'tgan ishlar, tadbir, shikoyatlar |
| `GET` | `/admin/audit` | admin | Audit jurnali (parol/token/push token hech qachon yozilmaydi) |
