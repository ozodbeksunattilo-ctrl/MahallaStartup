# Mahalladosh: dizayn topshirig‘i (mobil ilova uchun)

3-kishi (mobil ilova) uchun hujjat. Chizilgan maketlar va bosiladigan prototip: https://claude.ai/artifact/YDy9jhLYUdMa8m5Hcr8tN1 (Share orqali ulashilgandan keyin ochiladi). Tokenlar `tokens.ts` faylida, API — [FOR_CLIENTS.md](../FOR_CLIENTS.md) va `backend/openapi.yaml`. Veb-panel (`frontend/`) ham shu tokenlarda ishlaydi, shuning uchun uni ishlayotgan namuna sifatida ochib ko‘rish mumkin.

## Asosiy tamoyillar

- **Til:** o‘zbek lotin. Apostrof uchun `‘` (U+2018) ishlatiladi, `'` emas: `Bog‘`, `o‘tgan`.
- **Holat faqat rang bilan berilmaydi.** Har bir badge’da ikonka va matn bo‘ladi (`tokens.status`).
- **Bosish maydoni** kamida 48 dp, asosiy tugmalar 52 dp va to‘liq kenglikda.
- **Asosiy matn** 16 dan kichik bo‘lmaydi. Ikkinchi darajali matn 13, `muted` rangda.
- **Fon** issiq qog‘oz rangida (`bg`), kartalar oq (`surface`), chegara `line` rangida, soya juda yengil.
- **Ikonkalar:** `lucide-react-native`, veb bilan bir xil nomlar. Emoji ishlatilmaydi.
- **Vaqt** Toshkent vaqtida va `dd.mm.yyyy, HH:mm` formatida ko‘rsatiladi. Qolgan vaqt `6 kun 10 soat` ko‘rinishida beriladi (`frontend/lib/rules.ts` → `timeLeft`).
- **Foydalanuvchi matni** faqat oddiy matn sifatida ko‘rsatiladi: HTML yoki markdown render qilinmaydi.

## Komponentlar va holatlari

| Komponent | Variantlar | Holatlar |
| --- | --- | --- |
| `Button` | `primary` (yashil, oq matn), `secondary` (oq, chegarali), `danger` (oq, qizil matn), `ghost` | default · pressed (`primaryPressed`) · disabled (55% shaffoflik) · loading (spinner va matn, bosilmaydi) |
| `VoteButton` | — | **«Ovoz berish»** (primary) · **«Ovoz berildi ✓ / Qaytarib olish»** (secondary, `Check` ikonka) · **«Ovozlar tugadi»** (disabled, ostida «3 ta ovozdan 3 tasi berilgan») · **«Davr yopilgan»** (disabled) · loading. Javob kelguncha son optimistik o‘zgaradi, xato bo‘lsa avvalgi holatga qaytadi va toast chiqadi. |
| `StatusBadge` | 8 holat (`tokens.status`) | pill shakl: `bg` fon, `fg` ikonka va matn. `OPEN` + joriy davr → `VOTING`. |
| `IssueCard` | lenta elementi | 64×64 thumbnail (yo‘q bo‘lsa toifa ikonkasi) · sarlavha (2 qator) · toifa va joy · badge · ovoz soni |
| `Field` | input, textarea, select | label tepada · hint ostida · xato qizil matnda va qizil chegara bilan (`aria-invalid`) |
| `MediaPicker` | foto ≤ 3 (5 MB), video ≤ 1 (25 MB) | bo‘sh · yuklanmoqda (progress %) · yuklandi (✓) · xato (qizil, **«Qayta urinish»** tugmasi) · o‘chirish (×). Post yuborish tugmasi barcha fayllar yuklangach faollashadi. |
| `Notice` | info · ok · warn · error | ikonka + matn, rangli fon |
| `EmptyState` | — | `Inbox` ikonka · sarlavha · ixtiyoriy tugma |
| `ErrorState` | — | `AlertTriangle` · «Ma’lumotni yuklab bo‘lmadi» · server xabari · **«Qayta urinish»** |
| `Skeleton` | ro‘yxat kartasi | 3 ta kulrang blok, shimmer |
| `Toast` | ok · error | pastda 3 soniya |
| `Timeline` | holat tarixi | nuqta va chiziq · holat nomi · vaqt · kim · izoh · sabab · foto. Muallif e’tirozi qizil nuqta bilan. |

## Ekranlar

Pastki navigatsiya: `Bosh sahifa` (Home) · `Muammolar` (ClipboardList) · `Tadbirlar` (CalendarDays) · `Chat` (MessagesSquare) · `Profil` (User). Bildirishnomalar qo‘ng‘irog‘i (Bell + o‘qilmaganlar soni) har bir ekranning yuqori o‘ng burchagida turadi.

1. **Kirish.** Mahalladosh logotipi, `Login`, `Parol`, «Kirish» tugmasi. 401 bo‘lsa «Login yoki parol noto‘g‘ri», `BLOCKED` bo‘lsa «Akkaunt bloklangan. Mahalla admini bilan bog‘laning».
2. **Birinchi parol.** `mustChangePassword` bo‘lsa boshqa ekranlar ochilmaydi. Maydonlar: vaqtinchalik parol, yangi parol (≥ 8), takror.
3. **Bosh sahifa.** Ketma-ket kartalar:
   - Ovoz davri: «Noyabr ovozi · tugashiga 6 kun 10 soat · sizda 2 ta ovoz qoldi», 3 ta nuqta indikator.
   - G‘olib yoki jarayondagi muammo: sarlavha, badge, mas’ul, muddat.
   - Navbatdagi tadbir.
   - Oxirgi muhim e’lon.
   - FAB yoki to‘liq kenglikdagi **«Muammo yuborish»** tugmasi.
4. **Muammolar lentasi.** Tepada chiplar: toifa, holat, «Joriy oy». Saralash: «Eng yangi» / «Ko‘p ovoz». Ro‘yxat `IssueCard` lardan iborat, sahifalab yuklanadi (cursor), pull-to-refresh bor.
5. **Muammo yuborish.** Sarlavha, tavsif, toifa (6 ta katta chip), joy matni (hint: «Jamoat joyi yoki mo‘ljal. Uy manzilingizni yozmang»), `MediaPicker`. Tepada `warn` notice: «Shoshilinch xavf bo‘lsa (yong‘in, gaz, elektr simi uzilgan), avval 101 / 104 / 112 ga qo‘ng‘iroq qiling». Yuborishda `Idempotency-Key` yuboriladi, qoralama qurilmada saqlanadi. Muvaffaqiyatdan keyin «Post moderatsiyaga yuborildi» ekrani chiqadi.
6. **Muammo tafsiloti.** Media karusel, sarlavha, badge, toifa va joy, tavsif, `VoteButton` va ovoz soni, «Kuzatish» (Bell) tugmasi, ish yuritish kartasi (mas’ul, keyingi qadam, muddat, tashkilot), `Timeline`, izohlar va ⋯ → «Shikoyat qilish».
   - `REJECTED`: muallifga sabab va «Tahrirlash» ko‘rinadi.
   - Bog‘langan postda «Asosiy postga o‘tish» havolasi chiqadi.
   - `RESOLVED`: muallifga «Natijani tasdiqlayman» va «Muammo davom etmoqda» (izoh + foto) tugmalari ko‘rinadi.
7. **Tadbirlar.** Kelayotgan va o‘tgan tadbirlar ro‘yxati. Tafsilotda sana, joy, tashkilotchi, qatnashchilar soni va **«Qatnashaman»** (toggle) tugmasi bor. Bekor qilingan tadbirda qizil notice va sabab chiqadi, yakunlanganida natija va fotolar ko‘rinadi.
8. **Chat.** Bitta umumiy chat. Xabarlar pastdan yuqoriga joylashadi, o‘zingizniki o‘ngda va `primarySoft` fonda turadi. Holatlar: yuborilmoqda (soat) · yuborildi (✓) · xato (qizil, bosganda qayta yuboriladi). Tarix yuqoriga skroll qilinganda yuklanadi. Uzilishdan keyin `after=<oxirgi id>` bilan davom etadi. Yuborilmagan matn saqlanib qoladi. Uzoq bosganda «Shikoyat qilish» chiqadi.
9. **E’lonlar.** Ro‘yxat ko‘rinishida, muhim e’lonlarda qizil «Muhim» badge bor.
10. **Bildirishnomalar.** O‘qilmaganlari qalin va chapda nuqta bilan ko‘rsatiladi. «Hammasini o‘qilgan deb belgilash» tugmasi bor. Bosilganda `target` sahifasi ochiladi.
11. **Profil.** Ko‘rsatiladigan ism, mahalla nomi, «Parolni almashtirish», bildirishnoma ruxsati holati va «Chiqish».

Har bir ro‘yxat va sahifada to‘rt holat bor: **yuklanmoqda** (Skeleton) · **bo‘sh** (EmptyState, matni ekranga mos) · **tarmoq xatosi** (ErrorState + Qayta urinish) · **ma’lumot**.

## Xato kodlari → foydalanuvchi matni

| Kod | Matn |
| --- | --- |
| `NETWORK` | Tarmoq bilan aloqa yo‘q. Internetni tekshirib, qayta urining. |
| `VOTE_LIMIT` | Bu oy uchun 3 ta ovozingiz tugadi. Boshqa postga berish uchun birini qaytarib oling. |
| `ROUND_CLOSED` | Ovoz berish davri yopilgan. |
| `FILE_TOO_LARGE` | Rasm 5 MB, video 25 MB dan oshmasin. |
| `UNSUPPORTED_MEDIA` | Faqat JPG, PNG, WEBP, HEIC rasm yoki MP4, MOV video. |
| `RATE_LIMITED` | Juda ko‘p urinish. Birozdan keyin qayta urining. |
| boshqa | serverdan kelgan `error.message` |
