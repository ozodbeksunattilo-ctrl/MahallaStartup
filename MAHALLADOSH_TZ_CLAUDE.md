# Mahalladosh — Claude Code uchun texnik topshiriq

## 1. Vazifa

Mahalladoshning ishlaydigan MVP versiyasini yarat. Aholi Android va iOS mobil ilovasida o‘z mahallasidagi muammolarni matn, foto yoki video bilan e’lon qiladi, ovoz beradi va natijani kuzatadi. Mahalla xodimlari veb-panel orqali akkauntlar, postlar, oylik ovoz berish, tadbirlar, chat va e’lonlarni boshqaradi. Ikkala ilova bitta backend va ma’lumotlar bazasi bilan ishlaydi.

Birinchi namoyish ssenariysi: admin fuqaro uchun akkaunt ochadi → fuqaro birinchi kirishda parolini almashtiradi → ishlamayotgan ko‘cha chirog‘i haqida foto bilan post yuboradi → admin postni tasdiqlaydi → qo‘shnilar ovoz beradi → oy yakunida g‘olib aniqlanadi → admin mas’ul va muddatni e’lon qiladi → bajarilgan ish fotosi postda ko‘rinadi va kuzatuvchilarga bildirishnoma boradi.

Repo mavjud bo‘lsa, avval `README`, `AGENTS.md`, `CLAUDE.md`, mavjud kod va migratsiyalarni ko‘r. Talablarga mos keladigan arxitekturani davom ettir va ishlayotgan funksiyalarni saqla. Bo‘sh repo bo‘lsa, 9-bo‘limdagi arxitekturadan boshla. Claude Code sessiyasida 10-bo‘limdagi topshirilgan rol bo‘yicha qisqa reja tuz, o‘z qismingni implementatsiya qil va tekshir. Umumiy ssenariy jamoa integratsiyasida tekshiriladi.

## 2. Rollar va kirish

| Rol | Huquqlar |
| --- | --- |
| Aholi | O‘z mahallasining lentasi, chat va e’lonlarini ko‘rish. Post yuborish, ovoz berish, izoh qoldirish, tadbirga yozilish va kontent ustidan shikoyat yuborish. |
| Mahalla admini | O‘z mahallasida akkaunt yaratish, vaqtinchalik parolni qayta chiqarish, akkauntni bloklash, moderatsiya, g‘olib masala bo‘yicha ishni yuritish, tadbir va e’lonlarni nashr qilish. |
| Platforma operatori | Mahalla va uning birinchi adminini himoyalangan server buyrug‘i orqali yaratish. Bu rol uchun alohida UI keyingi bosqichga kiradi. |

- Ochiq ro‘yxatdan o‘tish MVP doirasidan tashqarida. Admin aholini tekshiradi, veb-panelda akkaunt ochadi va login bilan tizim yaratgan vaqtinchalik parolni foydalanuvchiga beradi. Parol bir marta ko‘rsatiladi va muddati tugaganda admin yangisini chiqarishi mumkin.
- Birinchi kirishda foydalanuvchi yangi parol o‘rnatmaguncha ilovaning boshqa bo‘limlari ochilmaydi. Parolni tiklash va akkauntni bloklash faol sessiyalarni bekor qiladi. Admin avvalgi parolni ko‘ra olmaydi.
- MVPda aholi akkaunti bir mahallaga biriktiriladi. Backend rollar va faol mahalla a’zoligini har bir himoyalangan so‘rovda tekshiradi. Boshqa mahallaning posti, chati, bildirishnomasi va media fayliga ID orqali ham kirish yopiq.
- Aholiga ko‘rinadigan profilda faqat ko‘rsatish ismi bo‘ladi. To‘liq uy manzili yoki pasport ma’lumoti so‘ralmaydi. Muammo joyi sifatida jamoat joyi yoki mo‘ljal yoziladi.

## 3. Muammolar va moderatsiya

- Postning majburiy maydonlari — sarlavha, tavsif, toifa va joylashuv matni. Foto va video ixtiyoriy. Boshlang‘ich toifalar — yo‘l, yoritish, chiqindi, suv, obodonlashtirish, boshqa.
- Mobil ilova bir postga uchtagacha rasm va bitta qisqa video olish yoki galereyadan tanlashga ruxsat beradi. Boshlang‘ich yuklash chegarasi har bir rasm uchun 5 MB, video uchun 25 MB. Server fayl hajmi va formatini tekshiradi. Yuklanish jarayoni, xato va qayta urinish ilovada ko‘rinadi. Qayta urinish dublikat post yaratmasin.
- Yangi post `PENDING_REVIEW` holatida turadi. Uni muallif va admin ko‘radi. Admin tasdiqlasa, post lentaga va joriy ovoz berish davriga qo‘shiladi. Rad etsa, muallif sababni ko‘radi, postni tahrirlaydi va qayta yuborishi mumkin.
- Admin bir xil muammolarni asosiy postga bog‘lay oladi. MVPda bu amal ikkinchi post hali moderatsiyada turganda mavjud. Muallif asosiy postga havola oladi va o‘sha yerda ovoz bera oladi. E’lon qilingan postning ovozlari va tarixini qo‘lda o‘zgartirishga ruxsat berilmaydi.
- Lenta toifa, holat va joriy oy bo‘yicha filtrlanadi. Saralash — eng yangi va joriy oyda eng ko‘p ovoz. Post sahifasida ovozlar soni, izohlar, kuzatish tugmasi hamda holat tarixi ko‘rinadi. Muallif o‘z postini avtomatik kuzatadi.
- Aholi post, izoh va chat xabari ustidan shikoyat yubora oladi. Admin shikoyatni ko‘rib chiqadi, zarur bo‘lsa kontentni yashiradi va sabab yozadi. Kontent yashirilgan bo‘lsa, oddiy foydalanuvchiga uning media fayli ham berilmaydi. Adminning moderatsiya harakati jurnalga tushadi.
- Post yaratish ekranida shoshilinch xavf bo‘lsa, tegishli tezkor xizmatga bevosita murojaat qilish eslatmasi bo‘ladi.

## 4. Oylik ovoz va g‘olib muammoni hal qilish

1. Har mahallaning ovoz berish davri `Asia/Tashkent` bo‘yicha kalendar oyining birinchi kuni soat 00:00 da boshlanadi va keyingi oyning birinchi kuni soat 00:00 da tugaydi. Bazada vaqt UTC formatida saqlanadi. Ilovada qolgan ovozlar soni va muddat ko‘rsatiladi.
2. Aholiga har oy uchta ovoz beriladi. Har bir postga bittadan ovoz berish mumkin. Davr yopilguncha foydalanuvchi ovozni qaytarib olishi va boshqa postga berishi mumkin. Backend ovoz limitini, davr muddati va postning ovozga ochiqligini tekshiradi. Bir vaqtda yuborilgan so‘rovlar umumiy limitni chetlab o‘tmasin. Bir xil amal qayta yuborilsa, ovoz ikki marta hisoblanmasin.
3. Davr tugagach backend davr yopilgan paytda ovozga ochiq va ko‘rinadigan postlardan eng ko‘p ovoz olgan bittasini g‘olib qiladi. Vazifa kechroq ishga tushsa ham, davr yopilgan paytdagi holat asos bo‘ladi. Tenglikda lentaga ertaroq chiqqan post yutadi. Vaqt ham teng bo‘lsa, postning barqaror ID tartibi ishlatiladi. Ovoz berilgan va g‘oliblikka mos post bo‘lmasa, natija «Bu oy g‘olib aniqlanmadi» bo‘ladi.
4. Davrni yopadigan vazifa qayta ishlatilganda o‘sha natijani qaytaradi. Har davrda bitta natija saqlanadi. G‘olib aniqlangan paytdagi hisoblar oylik hisobot uchun saqlanadi. Admin g‘olibni qo‘lda almashtira olmaydi. G‘olib bo‘lmagan ochiq masala admin amali orqali keyingi davrga kiritilishi mumkin. Yangi davrda u nol ovozdan boshlaydi.
5. G‘olib post `SELECTED` bo‘ladi. Admin mas’ul shaxs yoki bo‘lim, keyingi qadam va kutilayotgan muddatni kiritib holatni `IN_PROGRESS` ga o‘tkazadi. Tashkilotga yuborilsa, `REFERRED` holati, tashkilot nomi, yuborilgan sana va keyingi tekshiruv sanasi ko‘rsatiladi.
6. `RESOLVED` holatida admin bajarilgan ish haqida yozadi, imkon bo‘lsa foto biriktiradi. Muallif natijani tasdiqlashi yoki «Muammo davom etmoqda» deb dalil va izoh yuborishi mumkin. Admin izoh asosida masalani `IN_PROGRESS` holatiga qaytara oladi. Muddat yoki holat o‘zgarsa, sababi tarixga yoziladi.

| Tizim holati | Aholi ko‘radigan yozuv |
| --- | --- |
| `PENDING_REVIEW` | Moderatsiyada |
| `REJECTED` | Tuzatish kerak |
| `OPEN` | Ochiq. Joriy davrga kiritilgan bo‘lsa «Ovoz berilmoqda» |
| `SELECTED` | Oylik ovozda tanlandi |
| `IN_PROGRESS` | Jarayonda |
| `REFERRED` | Tashkilotdan javob kutilmoqda |
| `RESOLVED` | Hal qilindi |

## 5. Chat, tadbir va e’lonlar

### Chat

- Har mahallada bitta umumiy matnli chat. Mobil ekran yangi xabarlarni avtomatik oladi, tarixni sahifalab yuklaydi va yuborilgan xabarning holatini ko‘rsatadi. Uzilishdan keyin so‘nggi ko‘rilgan xabardan davom etadi.
- Muammo ostidagi izohlar o‘sha postda alohida ko‘rinadi. Admin shikoyat bo‘yicha xabar yoki izohni yashira oladi. Shaxsiy chat va har bir tadbir uchun guruh chati keyingi relizga kiradi.

### Tadbirlar

- Admin har oy hashar, daraxt ekish, yig‘ilish yoki bayram tadbirini yaratib nashr qila oladi. Maydonlar — nom, tavsif, sana va vaqt, joy, tashkilotchi. Qatnashuvchi «Qatnashaman» deb belgilaydi yoki belgisini olib tashlaydi. Bitta akkaunt bitta ishtirok yozuviga ega.
- Admin qatnashchilar sonini ko‘radi. Tadbir vaqti yoki joyi o‘zgarsa, yoxud bekor qilinsa, yozilgan qatnashchilar xabar oladi. Boshlanishidan 24 soat oldin eslatma boradi. Yakunlangan tadbirga natija va foto qo‘shish mumkin.

### E’lon va bildirishnomalar

- Admin yangilik, bayram tabrigi yoki muhim xabarni qoralama qilib saqlaydi va mahallaga nashr qiladi. «Muhim» deb belgilangan e’lon uchun push yuboriladi. Xabarnoma tegishli post, e’lon yoki tadbir sahifasini ochadi.
- Ilova ichidagi bildirishnomalar — post holati, g‘olib muammo, kuzatilayotgan muammo yangilanishi, tadbir eslatmasi va muhim e’lon. O‘qilmaganlar soni va o‘qilgan deb belgilash mavjud.
- Push ruxsatini o‘chirgan foydalanuvchi ilova ichidagi bildirishnomani oladi. Bir voqeaning takroriy yuborilishi ichki bildirishnomani ko‘paytirmasin. Mahalliy demo push kalitlarisiz ham ichki bildirishnomalarni namoyish qilsin. Pushning qurilmadagi tekshiruvi alohida qayd etilsin.

## 6. Ekranlar va matnlar

**Mobil ilova.** Kirish va birinchi parolni almashtirish, bosh sahifa, muammolar lentasi, post yaratish va post tafsiloti, tadbirlar ro‘yxati va tafsiloti, mahalla chati, e’lonlar, bildirishnomalar va profil. Pastki navigatsiya — `Bosh sahifa`, `Muammolar`, `Tadbirlar`, `Chat`, `Profil`. Bosh sahifada ovoz berish muddati, g‘olib yoki jarayondagi muammo, navbatdagi tadbir va oxirgi muhim e’lon ko‘rinadi.

**Admin veb-panel.** Kirish, umumiy ko‘rsatkichlar, aholi, moderatsiya navbati, muammolar va ovoz natijalari, tadbirlar, e’lonlar, chat shikoyatlari hamda amallar jurnali. Dashboardda joriy davrning faol ovoz beruvchilari, moderatsiya kutayotgan postlar, muddatidan o‘tgan ishlar va navbatdagi tadbir ko‘rinadi.

**Dizayn.** Birinchi til — o‘zbek lotin yozuvi. Mahalla nomi va holat matnlari aniq ko‘rinsin. Rang holatning yagona belgisi bo‘lmasin. Katta bosish maydonlari, o‘qilishi oson shrift va aniq `Ovoz berish`, `Muammo yuborish`, `Qatnashaman` tugmalari ishlatilsin. Yuklanish, bo‘sh ro‘yxat, tarmoq xatosi va qayta urinish holatlari mobil va vebda ko‘rsatiladi. Admin paneli klaviatura bilan ishlasin va mobil brauzerda ham o‘qilsin.

## 7. Ma’lumotlar modeli

| Model | Saqlanadigan ma’lumot |
| --- | --- |
| `Mahalla`, `User`, `Membership`, `Session` | Mahalla, login va parol xeshi, rol va a’zolik holati, sessiyalar. |
| `Issue`, `MediaAttachment`, `IssueUpdate`, `IssueFollow` | Post, fayl metama’lumoti, holat tarixi, kuzatuvchilar. |
| `VotingRound`, `RoundEntry`, `Vote`, `RoundResult` | Davr, davrga kiritilgan postlar, ovozlar va yopilish natijasi. Mahalla va oy uchun bitta davr. Davr, post va ovoz beruvchi uchun bitta ovoz. |
| `Comment`, `ChatMessage`, `Report`, `AuditEvent` | Izohlar, xabarlar, shikoyatlar va admin amallari. |
| `Event`, `EventRSVP`, `Announcement`, `Notification`, `DeviceToken` | Tadbirlar, ishtirok, e’lonlar, bildirishnomalar va qurilma tokenlari. |

Mahallaga tegishli yozuvlar o‘sha mahalla bilan bog‘lansin. Ovoz, tadbirga yozilish va davr yakunining noyobligi DB cheklovlari bilan ta’minlansin. Jurnalga kim, qachon, qaysi obyektga qanday amal bajargani va zarur sabab yozilsin. Parol, sessiya tokeni va push tokeni jurnalga tushmasin.

## 8. API va asosiy talablar

- REST API uchun autentifikatsiya va akkauntlar, post va media, ovoz davrlari va natija, izoh va chat, shikoyat, tadbir, e’lon va bildirishnoma guruhlarini yarat. README yoki OpenAPI orqali har bir asosiy so‘rovning kirish maydonlari, javobi, rol talabi va xatolarini hujjatlashtir.
- Serverda kiruvchi qiymat va ruxsatlar tekshirilsin. Mobil ilova va veb-panel bir xil ovoz berish va status qoidalariga tayanadi. Sana, ovozlar va holatlar bo‘yicha manba backend bo‘ladi.
- Parollar `Argon2id` bilan xeshlansin. Kirish urinishlariga limit qo‘yilsin. Mobil sessiya maxfiy ma’lumoti qurilmaning xavfsiz saqlash joyida, veb sessiyasi `HttpOnly` cookie orqali saqlansin. Ishlab chiqarish muhitida TLS, xavfsiz cookie va kerakli CSRF himoyasi ishlatilsin.
- Media private saqlash joyida bo‘lsin. Qisqa muddatli o‘qish havolasi foydalanuvchining postga kirish huquqi tekshirilgandan keyin beriladi. E’lon qilingan kontent oddiy matn sifatida ko‘rsatilsin va foto metama’lumotlaridan GPS olib tashlansin.
- Postlar, izohlar, chat va bildirishnoma ro‘yxatlari sahifalanadi. Tarmoq uzilganda yuborilmagan matn saqlanadi. Vaqtli vazifalar qayta uringanda bitta natija yoki bitta bildirishnoma yaratishi kerak.

## 9. Bo‘sh repo uchun taklif qilingan stek

| Qism | Tanlov |
| --- | --- |
| Mobil | Expo + React Native + TypeScript, Android va iOS uchun bitta kod bazasi |
| Admin | Next.js + TypeScript, moslashuvchan veb-interfeys |
| Backend | NestJS + TypeScript, REST API va vaqtli vazifalar |
| Baza va media | PostgreSQL + Prisma, private S3-compatible saqlash joyi |
| Push | Expo Push, ilova ichidagi bildirishnomalar DBda saqlanadi |
| Mahalliy muhit | Monorepo va Docker Compose orqali PostgreSQL hamda S3-compatible xizmat |

Tavsiya etilgan tuzilma — `apps/mobile`, `apps/admin`, `apps/api`. Mavjud repo boshqa stek bilan ishlasa, talablarni saqlagan holda o‘sha stekni davom ettir va tanlovni yakuniy hisobotda yoz. Asosiy ssenariylarda haqiqiy saqlashdan foydalan. Demo uchun seed ma’lumotlar real yozuvlarni almashtirib yubormaydigan alohida buyruq orqali qo‘shilsin.

## 10. Uch kishilik jamoada ish taqsimoti

| Kishi | Vazifasi | Topshiradigan natijasi |
| --- | --- | --- |
| **1. Frontend va dizayn** | Mobil ilova va admin panelining dizayni. Asosiy ekranlar, ranglar, tipografiya, komponentlar va ularning holatlarini belgilaydi. Admin veb-panelini yozadi va backend APIga ulaydi. | Mobil dasturchi ishlata oladigan maket va komponentlar tavsifi. Brauzerda ishlaydigan admin paneli (`apps/admin`). |
| **2. Backend** | Ikkala ilova uchun API va OpenAPI shartnomasi. PostgreSQL, migratsiyalar, login va ruxsatlar, media saqlash, moderatsiya, ovoz va oy yakuni, chat, tadbirlar, e’lonlar hamda bildirishnoma yuborish. | Lokal ishga tushadigan API (`apps/api`), migratsiya va demo ma’lumotlar. API shartnomasi, ishlatish yo‘riqnomasi va asosiy biznes qoidalari testlari. |
| **3. Mobil ilova** | 1-kishi bergan dizayn asosida Android va iOS ilovasini yozadi. Login, post va media yuklash, ovoz, chat, tadbirlar, e’lonlar va bildirishnoma ekranlarini backendga ulaydi. Qurilma tokenini ro‘yxatdan o‘tkazish va bildirishnomadan tegishli ekranni ochishni bajaradi. | Android va iOS uchun bitta kod bazasi (`apps/mobile`), qurilma yoki emulyatorda ishga tushirish yo‘riqnomasi va asosiy mobil oqimlar tekshiruvi. |

- **Ishni parallel boshlash.** 1-kishi login, muammolar lentasi, post yaratish, ovoz va admin moderatsiyasi maketlarini tayyorlaydi. 2-kishi shu oqimlar uchun URL, so‘rov va javob maydonlari, statuslar va xato formatini API shartnomasida belgilaydi. 3-kishi mobil loyiha tuzilmasi, navigatsiya va API klientini boshlaydi. Backend tayyor bo‘lguncha ikkala interfeys ham kelishilgan API javob namunalaridan foydalanishi mumkin.
- **Kod chegaralari.** Har kim o‘z ilovasi papkasidagi o‘zgarishlarga javobgar. API shartnomasini backend egasi yuritadi. API yoki umumiy konfiguratsiya o‘zgarsa, unga bog‘liq qismlarning egalari bilan kelishiladi va tegishli klientlar birga yangilanadi. Ovoz limiti, ruxsatlar va holat o‘tishlari backendda tekshiriladi.
- **Integratsiya.** Avval admin yaratgan akkaunt bilan mobil ilovaga kirishni tekshiring. Keyin mobil post → admin moderatsiyasi → mobil ovoz → backendda davr yakuni → adminda natijani kiritish → mobil bildirishnoma oqimini bitta demo bazada sinang. So‘ng chat, tadbir va e’lonlarni ulang. Yakuniy demoda vaqtincha API namunalari haqiqiy APIga almashtirilgan bo‘lishi kerak.

### Claude Code uchun alohida buyruqlar

**1-kishi.** «`MAHALLADOSH_TZ_CLAUDE.md` faylini o‘qi. Frontend va dizayn rolini bajar. Ikkala ilova uchun ekran dizaynini tayyorla, admin veb-panelini yoz va kelishilgan APIga ula. Mobil dasturchiga maketlar va komponentlar holatlarini topshir.»

**2-kishi.** «`MAHALLADOSH_TZ_CLAUDE.md` faylini o‘qi. Backend rolini bajar. Admin va mobil klientlar ishlata oladigan API shartnomasidan boshla. Keyin API, ma’lumotlar bazasi, migratsiyalar, demo ma’lumotlar va testlarni yoz.»

**3-kishi.** «`MAHALLADOSH_TZ_CLAUDE.md` faylini o‘qi. Mobil ilova rolini bajar. Kelishilgan dizayn va API shartnomasi asosida Android va iOS ilovasini yoz. Asosiy oqimlarni backendga ulab, qurilma yoki emulyatorda tekshir.»

## 11. Implementatsiya tartibi va topshirish

1. Mahalla izolyatsiyasi, rollar, login, vaqtinchalik parol, sessiyalar va demo akkauntlarni ishga tushir.
2. Mobil post yaratish, media yuklash, admin moderatsiyasi, ovoz, davr yakuni va bajarilgan ish tarixini to‘liq bog‘la. Android qurilmada va admin brauzerida 1-bo‘lim ssenariysini tekshir.
3. Chat va shikoyatlarni, tadbir va qatnashishni, e’lonlar hamda ilova ichidagi bildirishnomalarni qo‘sh. Push uchun sozlamalar va tekshirish yo‘lini hujjatlashtir.
4. README va `.env.example` qo‘sh. Ishga tushirish buyruqlari, migratsiya, seed, emulyator yoki qurilmadan APIga ulanish va test tartibini yoz. Repo ichiga haqiqiy kalitlar kiritma. Demo uchun ikki mahalla, har biriga admin va bir nechta aholi, postlar, tadbir hamda e’lon seed qil. Oy tugashini kutmasdan ovoz yakunini lokal tekshirish uchun soati boshqariladigan test yoki server buyrug‘ini ber. Oddiy foydalanuvchi ilovasida davrni erta yopish amali bo‘lmasin.
5. Yakunda bajarilgan funksiyalar, o‘zgartirilgan asosiy fayllar, ishga tushirish buyruqlari, ishlatilgan testlar va amalda tekshirilmagan bandlarni yoz. App Store va Google Play nashri alohida bosqich.

## 12. Qabul mezonlari

| Tekshiruv | Kutiladigan natija |
| --- | --- |
| Vaqtinchalik parol va bloklash | Birinchi kirishda parol almashtirish talab qilinadi. Admin bloklagan yoki parolini tiklagan foydalanuvchining eski sessiyasi ishlamaydi. |
| Mahallalar izolyatsiyasi | A mahallasining akkaunti B mahallasining postini, media havolasini, chatini yoki admin amallarini to‘g‘ridan-to‘g‘ri so‘rov orqali ham ishlata olmaydi. |
| Post va media | Foto va video biriktirilgan post moderatsiyadan o‘tadi. Rad etilgan postning sababi muallifga ko‘rinadi. Uzilgan yuklashni takrorlash postni ko‘paytirmaydi. |
| Ovozlar | Takroriy ovoz, to‘rtinchi ovoz va yopilgan davrga ovoz yozilmaydi. Ochiq davrda ovozni qaytarish limitni tiklaydi. Bir vaqtda yuborilgan so‘rovlar ham limitni buzmaydi. |
| Oy yakuni | Teng ovoz, ovozsiz davr va vazifaning takroriy ishlashi test bilan qoplanadi. G‘olib masala postida mas’ul, keyingi qadam va muddat ko‘rinadi. |
| Ish natijasi | Admin yakun matni va foto qo‘shadi. Aholi status tarixi va bildirishnomani ko‘radi. Muallif muammo davom etayotganini bildira oladi. |
| Tadbir va e’lon | Aholi yoziladi yoki yozuvni bekor qiladi. Bekor qilingan tadbir qatnashuvchiga xabar beradi. Muhim e’lon bildirishnomadan ochiladi. |
| Chat va moderatsiya | Shu mahalla a’zolari xabar almashadi. Shikoyat admin panelida ko‘rinadi va yashirilgan xabar lentadan chiqadi. |
| Lokal ishga tushirish | README bo‘yicha yangi muhitda backend, admin va mobil ilova demo ma’lumotlari bilan ishlaydi. MVP oqimlari uchun lint, typecheck va test natijalari qayd etiladi. |

Keyingi reliz uchun imkoniyatlar — tadbir guruh chatlari, xaritada muammolar, rus tili, tuman bo‘yicha yig‘ma hisobot va tashqi tashkilotlar bilan integratsiya. MVP natijasini ikki oy davomida faol ovoz beruvchilar soni, adminning birinchi javob vaqti va g‘olib muammo bo‘yicha e’lon qilingan qadamning bajarilishi bilan baholash mumkin.
