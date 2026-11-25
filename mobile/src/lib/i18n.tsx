import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

/** uz — o'zbek (lotin), oz — o'zbek (kirill), ru — rus, en — ingliz. Manba matnlar o'zbek lotinida yoziladi. */
export type Lang = 'uz' | 'oz' | 'ru' | 'en';

export const LANGS: Array<{ code: Lang; label: string }> = [
  { code: 'uz', label: "O'zbekcha" },
  { code: 'oz', label: 'Ўзбекча' },
  { code: 'ru', label: 'Русский' },
  { code: 'en', label: 'English' },
];

const KEY = 'mhd_lang';
let current: Lang = 'uz';

const norm = (s: string) => s.replace(/&apos;/g, "'").replace(/[ʻʼ’‘`´]/g, "'");

// ---------- Lotin -> kirill ----------
const CYR: Record<string, string> = {
  a: 'а', b: 'б', d: 'д', f: 'ф', g: 'г', h: 'ҳ', i: 'и', j: 'ж', k: 'к', l: 'л', m: 'м', n: 'н',
  o: 'о', p: 'п', q: 'қ', r: 'р', s: 'с', t: 'т', u: 'у', v: 'в', x: 'х', y: 'й', z: 'з',
};
const upper = (c: string) => c.toUpperCase();

function toCyrillic(input: string): string {
  const s = norm(input);
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i] as string;
    const low = ch.toLowerCase();
    const isUp = ch !== low;
    const next = (s[i + 1] ?? '').toLowerCase();
    const prev = s[i - 1] ?? ' ';
    const wordStart = !/[A-Za-z']/.test(prev);
    const put = (c: string) => (isUp ? (c.length > 1 ? upper(c[0] as string) + c.slice(1) : upper(c)) : c);
    const nextUp = s[i + 1] !== undefined && s[i + 1] !== next;

    if (!/[a-z]/.test(low)) {
      out += ch === "'" ? 'ъ' : ch;
      continue;
    }
    if ((low === 'o' || low === 'g') && s[i + 1] === "'") {
      out += put(low === 'o' ? 'ў' : 'ғ');
      i++;
      continue;
    }
    if (low === 's' && next === 'h') { out += put(nextUp && isUp ? 'Ш' : 'ш'); i++; continue; }
    if (low === 'c' && next === 'h') { out += put('ч'); i++; continue; }
    if (low === 'y' && (next === 'o' || next === 'u' || next === 'a')) {
      out += put(next === 'o' ? 'ё' : next === 'u' ? 'ю' : 'я');
      i++;
      continue;
    }
    if (low === 'e') { out += put(wordStart ? 'э' : 'е'); continue; }
    if (low === 'c') { out += put('ц'); continue; }
    if (low === 'w') { out += put('в'); continue; }
    out += put(CYR[low] ?? ch);
  }
  return out;
}

// ---------- Rus tarjimalari (kalit: normallashtirilgan o'zbek lotin matni) ----------
const RU_RAW: Record<string, string> = {
  // umumiy
  'Mahallamiz — bizning kuchimiz': 'Наша махалля — наша сила',
  'Yuklanmoqda…': 'Загрузка…',
  "Yuklab bo'lmadi": 'Не удалось загрузить',
  "Ma'lumot topilmadi": 'Данные не найдены',
  'Qayta urinish': 'Повторить',
  'Kutilmagan xato yuz berdi': 'Произошла непредвиденная ошибка',
  "Internetga ulanib bo'lmadi": 'Нет подключения к интернету',
  'Hammasi': 'Все',
  'Bekor qilish': 'Отмена',
  'Yuborish': 'Отправить',
  'Saqlash': 'Сохранить',
  'Saqlandi': 'Сохранено',
  'Yuborildi': 'Отправлено',
  'Rahmat': 'Спасибо',
  'Tahrirlash': 'Изменить',
  "O'chirish": 'Удалить',
  'Shikoyat': 'Жалоба',
  'Izoh': 'Комментарий',
  'Siz': 'Вы',
  'Natija': 'Результат',
  'Reyting': 'Рейтинг',
  // tablar
  'Bosh sahifa': 'Главная',
  'Muammolar': 'Проблемы',
  'Tadbirlar': 'События',
  'Chat': 'Чат',
  'Profil': 'Профиль',
  'Til': 'Язык',
  "Akkauntingiz yo'qmi? Ro'yxatdan o'ting": 'Нет аккаунта? Зарегистрируйтесь',
  "Ro'yxatdan o'tish": 'Регистрация',
  "Ma'lumotlaringizni yuboring — mahalla admini akkaunt yaratib beradi": 'Отправьте данные — администратор махалли создаст вам аккаунт',
  'Akkauntim bor — kirish': 'У меня есть аккаунт — войти',
  'Ism va familiya': 'Имя и фамилия',
  'Mahalla nomi': 'Название махалли',
  'Masalan, Navbahor mahallasi': 'Например, махалля Навбахор',
  'Manzil (ixtiyoriy)': 'Адрес (необязательно)',
  "Ko'cha, uy raqami": 'Улица, номер дома',
  "So'rov yuborish": 'Отправить заявку',
  "So'rov yuborildi": 'Заявка отправлена',
  "Mahalla admini ko'rib chiqadi va sizga login hamda parol beradi": 'Администратор рассмотрит заявку и выдаст вам логин и пароль',
  "Tasdiqlangach, admin bergan login va parol bilan ilovaga kirasiz.": 'После одобрения вы войдёте в приложение с логином и паролем от администратора.',
  'Kirish ekraniga': 'К экрану входа',
  "Akkauntni faqat mahalla admini beradi. Telefon raqami admin siz bilan bog'lanishi uchun kerak.": 'Аккаунт выдаёт только администратор махалли. Телефон нужен, чтобы он мог с вами связаться.',
  "Bu admin akkaunti. Admin veb-panel orqali kiradi; ilovada aholi akkaunti bilan kiring.": 'Это аккаунт администратора. Админ входит через веб-панель; в приложении войдите аккаунтом жителя.',
  'Oldingi davrlar': 'Прошлые периоды',
  // kirish
  'Mahalla admini bergan login va parol bilan kiring': 'Войдите с логином и паролем от администратора махалли',
  "Ma'lumotlaringiz himoyalangan. Faqat o'z mahallangiz aholisi va admini ko'radi.":
    'Ваши данные защищены. Их видят только жители и администратор вашей махалли.',
  'Login': 'Логин',
  'masalan, sardor.k': 'например, sardor.k',
  'Parol': 'Пароль',
  'Parolingiz': 'Ваш пароль',
  'Kirish': 'Войти',
  "Parolni ko'rsatish": 'Показать пароль',
  'Parolni yashirish': 'Скрыть пароль',
  // parol almashtirish
  'Parolni almashtirish': 'Смена пароля',
  'Juda zaif': 'Очень слабый',
  'Zaif': 'Слабый',
  "O'rtacha": 'Средний',
  'Yaxshi': 'Хороший',
  'Kuchli': 'Сильный',
  "Yangi parol kamida 8 belgidan iborat bo'lsin": 'Новый пароль — не менее 8 символов',
  'Parollar mos kelmadi': 'Пароли не совпадают',
  'Yangi parol eskisidan farq qilsin': 'Новый пароль должен отличаться от старого',
  "Vaqtinchalik parol bilan kirdingiz. Davom etish uchun yangi parol o'rnating.":
    'Вы вошли с временным паролем. Установите новый пароль, чтобы продолжить.',
  'Hisobingiz xavfsizligi uchun kuchli parol tanlang.': 'Выберите надёжный пароль для безопасности аккаунта.',
  'Joriy parol': 'Текущий пароль',
  'Yangi parol': 'Новый пароль',
  "Kamida 8 belgi: harf va raqam aralash bo'lsin": 'Минимум 8 символов: буквы и цифры',
  'Yangi parolni takrorlang': 'Повторите новый пароль',
  'Parolni saqlash': 'Сохранить пароль',
  // bosh sahifa
  'Xush kelibsiz': 'Добро пожаловать',
  'Mahalladosh': 'Махаллядош',
  "E'lonlar": 'Объявления',
  'Bildirishnomalar': 'Уведомления',
  'Ovoz berish davri': 'Период голосования',
  'ta ovoz qoldi': 'голоса осталось',
  'qoldi · oyiga 3 ta': 'осталось · 3 в месяц',
  'Ovoz berish': 'Голосовать',
  "Hozir faol davr yo'q": 'Сейчас нет активного периода',
  'Yangi ovoz berish davri boshlanganda xabar beramiz.': 'Мы сообщим, когда начнётся новое голосование.',
  'Oy muammosi': 'Проблема месяца',
  "Batafsil ko'rish →": 'Подробнее →',
  "Bu oy g'olib yoki jarayondagi muammo hali yo'q.": 'В этом месяце пока нет победителя или проблемы в работе.',
  'Yaqin tadbir': 'Ближайшее событие',
  "Rejalashtirilgan tadbir yo'q.": 'Запланированных событий нет.',
  'Barcha tadbirlar': 'Все события',
  "Muhim e'lon": 'Важное объявление',
  "MUHIM E'LON": 'ВАЖНОЕ ОБЪЯВЛЕНИЕ',
  // muammolar
  'Eng yangi': 'Новые',
  "Eng ko'p ovoz": 'Больше всего голосов',
  'Sizning ovozlaringiz': 'Ваши голоса',
  'ta qoldi': 'осталось',
  'Ovoz davri yuklanmoqda…': 'Загрузка периода голосования…',
  "Hozir faol ovoz berish davri yo'q": 'Сейчас нет активного голосования',
  'Filtr': 'Фильтр',
  'Faqat joriy oy ovozidagilar': 'Только участвующие в голосовании этого месяца',
  'Muammolar topilmadi': 'Проблемы не найдены',
  "Filtrni o'zgartiring yoki birinchi bo'lib muammo yuboring.": 'Измените фильтр или первым отправьте проблему.',
  'Muammo yuborish': 'Сообщить о проблеме',
  'Muammo': 'Проблема',
  'Ovoz berdingiz': 'Вы проголосовали',
  // statuslar
  'Moderatsiyada': 'На модерации',
  'Ovoz berilmoqda': 'Идёт голосование',
  'Tuzatish kerak': 'Нужно исправить',
  'Birlashtirilgan': 'Объединено',
  'Oylik ovozda tanlandi': 'Выбрано в месячном голосовании',
  'Jarayonda': 'В процессе',
  'Tashkilotdan javob kutilmoqda': 'Ожидается ответ организации',
  'Hal qilingan': 'Решено',
  'Nashr qilingan': 'Опубликовано',
  'Bekor qilingan': 'Отменено',
  'Yakunlangan': 'Завершено',
  'Qoralama': 'Черновик',
  "Yo'l": 'Дороги',
  'Yoritish': 'Освещение',
  'Chiqindi': 'Мусор',
  'Suv': 'Вода',
  'Obodonlashtirish': 'Благоустройство',
  'Boshqa': 'Другое',
  // muammo tafsiloti
  'Rasmni ochish': 'Открыть фото',
  'Videoni ochish': 'Открыть видео',
  "Moderator ko'rib chiqmoqda. Tasdiqlangach ovozga chiqadi.": 'Модератор проверяет. После одобрения проблема выйдет на голосование.',
  'Bu muammo birlashtirildi': 'Эта проблема объединена',
  "Ovoz berish va kuzatish o'sha yerda.": 'Голосование и отслеживание там.',
  "Asosiy postga o'tish": 'Перейти к основному посту',
  'Ish rejasi': 'План работ',
  "Mas'ul": 'Ответственный',
  'Keyingi qadam': 'Следующий шаг',
  'Muddat': 'Срок',
  'Tashkilot': 'Организация',
  'Yuborilgan sana': 'Дата отправки',
  'Keyingi tekshiruv': 'Следующая проверка',
  'Bajarilgan ish': 'Выполненная работа',
  'Natija sizni qoniqtirdimi?': 'Результат вас устроил?',
  "Ha, hal bo'ldi": 'Да, решено',
  'Muammo davom etmoqda': 'Проблема сохраняется',
  'Nima davom etmoqda? (dalil/izoh)': 'Что именно сохраняется? (доказательство/комментарий)',
  '3–1000 belgi': '3–1000 символов',
  'Ovoz': 'голос',
  'Ovoz berish yopiq': 'Голосование закрыто',
  'Ovozni qaytarib olish': 'Отозвать голос',
  'Kuzatishni bekor qilish': 'Не отслеживать',
  'Kuzatish': 'Отслеживать',
  'Holat tarixi': 'История статусов',
  'Izoh ustidan shikoyat': 'Пожаловаться на комментарий',
  "Hali izoh yo'q.": 'Комментариев пока нет.',
  'Yana izohlar': 'Ещё комментарии',
  'Izoh qoldiring': 'Оставьте комментарий',
  'Postdan shikoyat qilish': 'Пожаловаться на пост',
  "Holat o'zgardi": 'Статус изменён',
  'Muallif natijani tasdiqladi': 'Автор подтвердил результат',
  "Keyingi davrga o'tkazildi": 'Перенесено на следующий период',
  "Ma'lumotlar yangilandi": 'Данные обновлены',
  "Fikringiz adminga yuborildi.": 'Ваш отзыв отправлен администратору.',
  "Muammoni o'chirish": 'Удалить проблему',
  "Bu amalni qaytarib bo'lmaydi.": 'Это действие нельзя отменить.',
  'Tuzatib qayta yuborish': 'Исправить и отправить заново',
  'Admin izohi:': 'Комментарий администратора:',
  'Muammo qayta moderatsiyaga yuborildi.': 'Проблема повторно отправлена на модерацию.',
  "O'zgarishlar saqlandi.": 'Изменения сохранены.',
  "Bu muammoni endi tahrirlab bo'lmaydi.": 'Эту проблему больше нельзя редактировать.',
  'Muammoingiz moderatsiyaga tushdi. Tasdiqlangach ovozga chiqadi.': 'Ваша проблема отправлена на модерацию. После одобрения она выйдет на голосование.',
  'Hali muammo yubormagansiz': 'Вы ещё не отправляли проблем',
  'Mahallangizdagi muammoni rasm bilan yuboring.': 'Отправьте проблему вашей махалли с фото.',
  'Mening muammolarim': 'Мои проблемы',
  // forma
  'Sarlavha': 'Заголовок',
  '5–120 belgi': '5–120 символов',
  'Tavsif': 'Описание',
  "10–2000 belgi. Nima bo'lgan, qachondan beri?": '10–2000 символов. Что случилось и с какого времени?',
  'Joy': 'Место',
  "Jamoat joyi yoki mo'ljal (uy manzili yozmang)": 'Общественное место или ориентир (не указывайте домашний адрес)',
  'Toifa': 'Категория',
  'Foto va video': 'Фото и видео',
  'Ixtiyoriy. 3 tagacha rasm (har biri 5 MB gacha) va 1 ta video (25 MB gacha, ~60 soniya).':
    'Необязательно. До 3 фото (до 5 МБ каждое) и 1 видео (до 25 МБ, ~60 секунд).',
  'Galereya': 'Галерея',
  'Kamera': 'Камера',
  'Sozlamalarda kameraga ruxsat bering.': 'Разрешите доступ к камере в настройках.',
  'Limit': 'Лимит',
  "3 ta rasm va 1 ta video qo'shilgan.": 'Добавлено 3 фото и 1 видео.',
  "Faqat 1 ta video qo'shish mumkin": 'Можно добавить только 1 видео',
  "Eng ko'pi bilan 3 ta rasm": 'Не более 3 фото',
  "Rasmni tayyorlab bo'lmadi": 'Не удалось подготовить фото',
  "Ba'zi fayllar qo'shilmadi": 'Некоторые файлы не добавлены',
  "Ba'zi fayllar yuklanmadi. “Qayta urinish” ni bosing yoki faylni olib tashlang.": 'Некоторые файлы не загрузились. Нажмите «Повторить» или удалите файл.',
  "Faylni olib tashlash": 'Удалить файл',
  "Muammo moderator tasdiqlagandan keyin ovoz berishga chiqadi.": 'Проблема выйдет на голосование после одобрения модератором.',
  "Shoshilinch xavf bo'lsa, avval tezkor xizmatga qo'ng'iroq qiling": 'При срочной опасности сначала позвоните в экстренную службу',
  "Yong'in xizmati": 'Пожарная служба',
  'Politsiya': 'Полиция',
  'Tez yordam': 'Скорая помощь',
  // tadbirlar
  'Kelgusi': 'Предстоящие',
  "O'tgan": 'Прошедшие',
  'kishi qatnashadi': 'чел. участвует',
  'Qatnashasiz (bekor qilish)': 'Вы участвуете (отменить)',
  'Qatnashaman': 'Я приду',
  "O'tgan tadbirlar yo'q": 'Прошедших событий нет',
  "Kelgusi tadbirlar yo'q": 'Предстоящих событий нет',
  "Admin yangi tadbir nashr qilganda shu yerda ko'rinadi.": 'Когда администратор опубликует событие, оно появится здесь.',
  'Tadbir': 'Событие',
  'Tadbir natijasi': 'Итог события',
  'Bu tadbir bekor qilingan.': 'Это событие отменено.',
  'Qatnashasiz — bekor qilish': 'Вы участвуете — отменить',
  'Qatnashish': 'Участвовать',
  // e'lonlar, bildirishnomalar, ovoz davrlari
  "E'lonlar yo'q": 'Объявлений нет',
  "Admin e'lon nashr qilganda shu yerda ko'rinadi.": 'Когда администратор опубликует объявление, оно появится здесь.',
  "E'lon": 'Объявление',
  "Hammasini o'qish": 'Прочитать все',
  "Bildirishnomalar yo'q": 'Уведомлений нет',
  "Post holati, g'olib muammo va tadbirlar haqida shu yerda xabar olasiz.": 'Здесь вы получите уведомления о статусе постов, победившей проблеме и событиях.',
  'Ovoz davrlari': 'Периоды голосования',
  'Oldingi ovoz davrlari': 'Прошлые периоды голосования',
  'Davr natijasi': 'Итог периода',
  "Davrlar yo'q": 'Периодов нет',
  "G'olib muammo": 'Победившая проблема',
  "Bu oy g'olib aniqlanmadi": 'В этом месяце победитель не определён',
  'Muammoni ochish': 'Открыть проблему',
  'Ovoz bergan aholi:': 'Проголосовало жителей:',
  'Jami ovozlar:': 'Всего голосов:',
  // chat
  "Hali xabar yo'q": 'Сообщений пока нет',
  "Birinchi bo'lib qo'shnilarga salom yozing.": 'Напишите соседям первым.',
  'Xabar yozing…': 'Напишите сообщение…',
  'Yuborilmadi': 'Не отправлено',
  '↻ Qayta yuborish': '↻ Отправить снова',
  "Shikoyat qilish uchun bosib turing": 'Удерживайте, чтобы пожаловаться',
  'Mahalla chati': 'Чат махалли',
  'Admin bilan chat': 'Чат с админом',
  'Admin': 'Админ',
  'Adminga yozing…': 'Напишите администратору…',
  "Savol yoki taklifingizni yozing — admin shu yerda javob beradi.": 'Напишите вопрос или предложение — администратор ответит здесь.',
  // profil
  'Chiqish': 'Выйти',
  'Akkauntdan chiqmoqchimisiz?': 'Выйти из аккаунта?',
  'Akkaunt': 'Аккаунт',
  'Telefon': 'Телефон',
  'Sahifa topilmadi': 'Страница не найдена',
  'Bosh sahifaga qaytish': 'Вернуться на главную',
  // shikoyat
  'Shikoyat qilish': 'Пожаловаться',
  'Sababni tanlang. Admin ko‘rib chiqadi.': 'Выберите причину. Администратор рассмотрит жалобу.',
  'Shikoyatingiz adminga yuborildi.': 'Ваша жалоба отправлена администратору.',
  "Yuborib bo'lmadi": 'Не удалось отправить',
  'Spam yoki reklama': 'Спам или реклама',
  'Haqorat yoki tahdid': 'Оскорбления или угрозы',
  "Noto'g'ri ma'lumot": 'Недостоверная информация',
  'Boshqa sabab': 'Другая причина',
  // vaqt
  'tugadi': 'завершено',
  'hozirgina': 'только что',
  'yanvar': 'январь', 'fevral': 'февраль', 'mart': 'март', 'aprel': 'апрель', 'may': 'май', 'iyun': 'июнь',
  'iyul': 'июль', 'avgust': 'август', 'sentabr': 'сентябрь', 'oktabr': 'октябрь', 'noyabr': 'ноябрь', 'dekabr': 'декабрь',
  'daqiqa': 'мин.',
  'daqiqa oldin': 'мин. назад',
  'soat oldin': 'ч. назад',
  'kun oldin': 'дн. назад',
  // chat, profil va qolgan matnlar
  'Admin bilan': 'С админом',
  "Xabar yo'q": 'Сообщений нет',
  'Javob kutmoqda ·': 'Ждёт ответа ·',
  "Hozircha suhbat yo'q. Aholi yozganda shu yerda ko'rinadi.": 'Пока нет переписки. Когда жители напишут, она появится здесь.',
  'Mahalla aholisi va admin ishtirok etadigan umumiy chat.': 'Общий чат жителей махалли и администратора.',
  "Shaxsiy suhbat: faqat siz va mahalla admini ko'radi. Savol yoki taklifingizni yozing.":
    'Личный чат: его видите только вы и администратор махалли. Напишите вопрос или предложение.',
  'Savol yoki taklifingizni yuboring — admin shu yerda javob beradi.': 'Отправьте вопрос или предложение — администратор ответит здесь.',
  'Ha, chiqish': 'Да, выйти',
  'Muallif: muammo davom etmoqda': 'Автор: проблема сохраняется',
  '★ Kuzatilmoqda': '★ Отслеживается',
};

const RU: Record<string, string> = {};
for (const [k, v] of Object.entries(RU_RAW)) RU[norm(k)] = v;

/** Interpolyatsiyali matnlar */
const RU_PATTERNS: Array<[RegExp, (m: RegExpExecArray) => string]> = [
  [/^Salom, (.+)$/, (m) => `Привет, ${m[1]}`],
  [/^Holat: (.+)$/, (m) => `Статус: ${tr(m[1] as string)}`],
  [/^(\d+) ovoz$/, (m) => `${m[1]} голосов`],
  [/^Izohlar \((\d+)\)$/, (m) => `Комментарии (${m[1]})`],
  [/^(\d+) ta ovoz qoldi$/, (m) => `Осталось голосов: ${m[1]}`],
  [/^(\d+) ta qoldi$/, (m) => `Осталось: ${m[1]}`],
  [/^(\d+) kishi qatnashadi$/, (m) => `Участвуют: ${m[1]}`],
  [/^(\d+) daqiqa oldin$/, (m) => `${m[1]} мин. назад`],
  [/^(\d+) soat oldin$/, (m) => `${m[1]} ч. назад`],
  [/^(\d+) kun oldin$/, (m) => `${m[1]} дн. назад`],
  [/^(\d+) kun (\d+) soat$/, (m) => `${m[1]} дн. ${m[2]} ч.`],
  [/^(\d+) soat (\d+) daqiqa$/, (m) => `${m[1]} ч. ${m[2]} мин.`],
  [/^(\d+) daqiqa$/, (m) => `${m[1]} мин.`],
  [/^Yangi\. (.*)$/, (m) => `Новое. ${tr(m[1] as string)}`],
  [/^(.+) — (.+)ga qo'ng'iroq qilish$/, (m) => `${tr(m[1] as string)} — позвонить: ${m[2]}`],
  [/^Rasm ([\d.,]+) MB — 5 MB dan oshmasin$/, (m) => `Фото ${m[1]} МБ — не больше 5 МБ`],
  [/^Video ([\d.,]+) MB — 25 MB dan oshmasin$/, (m) => `Видео ${m[1]} МБ — не больше 25 МБ`],
];

// ---------- English (same keys as RU_RAW) ----------
const EN_RAW: Record<string, string> = {
  'Mahallamiz — bizning kuchimiz': 'Our mahalla is our strength',
  'Yuklanmoqda…': 'Loading…',
  "Yuklab bo'lmadi": 'Couldn’t load',
  "Ma'lumot topilmadi": 'Nothing found',
  'Qayta urinish': 'Try again',
  'Kutilmagan xato yuz berdi': 'Something went wrong',
  "Internetga ulanib bo'lmadi": 'No internet connection',
  'Hammasi': 'All',
  'Bekor qilish': 'Cancel',
  'Yuborish': 'Send',
  'Saqlash': 'Save',
  'Saqlandi': 'Saved',
  'Yuborildi': 'Sent',
  'Rahmat': 'Thank you',
  'Tahrirlash': 'Edit',
  "O'chirish": 'Delete',
  'Shikoyat': 'Report',
  'Izoh': 'Comment',
  'Siz': 'You',
  'Natija': 'Result',
  'Reyting': 'Ranking',
  'Bosh sahifa': 'Home',
  'Muammolar': 'Issues',
  'Tadbirlar': 'Events',
  'Chat': 'Chat',
  'Profil': 'Profile',
  'Til': 'Language',
  "Akkauntingiz yo'qmi? Ro'yxatdan o'ting": 'No account? Sign up',
  "Ro'yxatdan o'tish": 'Sign up',
  "Ma'lumotlaringizni yuboring — mahalla admini akkaunt yaratib beradi": 'Send your details — your mahalla admin will create an account for you',
  'Akkauntim bor — kirish': 'I have an account — sign in',
  'Ism va familiya': 'Full name',
  'Mahalla nomi': 'Mahalla name',
  'Masalan, Navbahor mahallasi': 'e.g. Navbahor mahalla',
  'Manzil (ixtiyoriy)': 'Address (optional)',
  "Ko'cha, uy raqami": 'Street, house number',
  "So'rov yuborish": 'Send request',
  "So'rov yuborildi": 'Request sent',
  "Mahalla admini ko'rib chiqadi va sizga login hamda parol beradi": 'Your mahalla admin will review it and give you a login and password',
  'Tasdiqlangach, admin bergan login va parol bilan ilovaga kirasiz.': 'Once approved, sign in with the login and password from your admin.',
  'Kirish ekraniga': 'Back to sign in',
  "Akkauntni faqat mahalla admini beradi. Telefon raqami admin siz bilan bog'lanishi uchun kerak.":
    'Only your mahalla admin can create accounts. Your phone number lets the admin contact you.',
  'Bu admin akkaunti. Admin veb-panel orqali kiradi; ilovada aholi akkaunti bilan kiring.':
    'This is an admin account. Admins sign in on the web panel; use a resident account in the app.',
  'Oldingi davrlar': 'Past rounds',
  'Mahalla admini bergan login va parol bilan kiring': 'Sign in with the login and password from your mahalla admin',
  "Ma'lumotlaringiz himoyalangan. Faqat o'z mahallangiz aholisi va admini ko'radi.":
    'Your data is protected. Only residents and the admin of your mahalla can see it.',
  'Login': 'Login',
  'masalan, sardor.k': 'e.g. sardor.k',
  'Parol': 'Password',
  'Parolingiz': 'Your password',
  'Kirish': 'Sign in',
  "Parolni ko'rsatish": 'Show password',
  'Parolni yashirish': 'Hide password',
  'Parolni almashtirish': 'Change password',
  'Juda zaif': 'Very weak',
  'Zaif': 'Weak',
  "O'rtacha": 'Fair',
  'Yaxshi': 'Good',
  'Kuchli': 'Strong',
  "Yangi parol kamida 8 belgidan iborat bo'lsin": 'The new password needs at least 8 characters',
  'Parollar mos kelmadi': 'Passwords don’t match',
  'Yangi parol eskisidan farq qilsin': 'The new password must differ from the old one',
  "Vaqtinchalik parol bilan kirdingiz. Davom etish uchun yangi parol o'rnating.":
    'You signed in with a temporary password. Set a new one to continue.',
  'Hisobingiz xavfsizligi uchun kuchli parol tanlang.': 'Choose a strong password to keep your account safe.',
  'Joriy parol': 'Current password',
  'Yangi parol': 'New password',
  "Kamida 8 belgi: harf va raqam aralash bo'lsin": 'At least 8 characters, mixing letters and numbers',
  'Yangi parolni takrorlang': 'Repeat the new password',
  'Parolni saqlash': 'Save password',
  'Xush kelibsiz': 'Welcome',
  'Mahalladosh': 'Mahalladosh',
  "E'lonlar": 'Announcements',
  'Bildirishnomalar': 'Notifications',
  'Ovoz berish davri': 'Voting round',
  'ta ovoz qoldi': 'votes left',
  'qoldi · oyiga 3 ta': 'left · 3 a month',
  'Ovoz berish': 'Vote',
  "Hozir faol davr yo'q": 'No active round right now',
  'Yangi ovoz berish davri boshlanganda xabar beramiz.': 'We’ll let you know when a new voting round starts.',
  'Oy muammosi': 'Issue of the month',
  "Batafsil ko'rish →": 'See details →',
  "Bu oy g'olib yoki jarayondagi muammo hali yo'q.": 'No winning or in-progress issue this month yet.',
  'Yaqin tadbir': 'Next event',
  "Rejalashtirilgan tadbir yo'q.": 'No events planned.',
  'Barcha tadbirlar': 'All events',
  "Muhim e'lon": 'Important announcement',
  "MUHIM E'LON": 'IMPORTANT ANNOUNCEMENT',
  'Eng yangi': 'Newest',
  "Eng ko'p ovoz": 'Most votes',
  'Sizning ovozlaringiz': 'Your votes',
  'ta qoldi': 'left',
  'Ovoz davri yuklanmoqda…': 'Loading the voting round…',
  "Hozir faol ovoz berish davri yo'q": 'No active voting round right now',
  'Filtr': 'Filter',
  'Faqat joriy oy ovozidagilar': 'Only issues in this month’s vote',
  'Muammolar topilmadi': 'No issues found',
  "Filtrni o'zgartiring yoki birinchi bo'lib muammo yuboring.": 'Change the filter or be the first to report an issue.',
  'Muammo yuborish': 'Report an issue',
  'Muammo': 'Issue',
  'Ovoz berdingiz': 'You voted',
  'Moderatsiyada': 'In review',
  'Ovoz berilmoqda': 'Voting open',
  'Tuzatish kerak': 'Needs changes',
  'Birlashtirilgan': 'Merged',
  'Oylik ovozda tanlandi': 'Chosen in the monthly vote',
  'Jarayonda': 'In progress',
  'Tashkilotdan javob kutilmoqda': 'Waiting for an organization',
  'Hal qilingan': 'Solved',
  'Nashr qilingan': 'Published',
  'Bekor qilingan': 'Cancelled',
  'Yakunlangan': 'Completed',
  'Qoralama': 'Draft',
  "Yo'l": 'Roads',
  'Yoritish': 'Lighting',
  'Chiqindi': 'Waste',
  'Suv': 'Water',
  'Obodonlashtirish': 'Public spaces',
  'Boshqa': 'Other',
  'Rasmni ochish': 'Open photo',
  'Videoni ochish': 'Open video',
  "Moderator ko'rib chiqmoqda. Tasdiqlangach ovozga chiqadi.": 'A moderator is reviewing it. Once approved, it goes to the vote.',
  'Bu muammo birlashtirildi': 'This issue was merged',
  "Ovoz berish va kuzatish o'sha yerda.": 'Voting and following happen there.',
  "Asosiy postga o'tish": 'Go to the main post',
  'Ish rejasi': 'Work plan',
  "Mas'ul": 'Responsible',
  'Keyingi qadam': 'Next step',
  'Muddat': 'Deadline',
  'Tashkilot': 'Organization',
  'Yuborilgan sana': 'Date sent',
  'Keyingi tekshiruv': 'Next check',
  'Bajarilgan ish': 'Work done',
  'Natija sizni qoniqtirdimi?': 'Are you happy with the result?',
  "Ha, hal bo'ldi": 'Yes, it’s solved',
  'Muammo davom etmoqda': 'Problem persists',
  'Nima davom etmoqda? (dalil/izoh)': 'What is still wrong? (evidence or comment)',
  '3–1000 belgi': '3–1000 characters',
  'Ovoz': 'vote',
  'Ovoz berish yopiq': 'Voting closed',
  'Ovozni qaytarib olish': 'Take back vote',
  'Kuzatishni bekor qilish': 'Unfollow',
  'Kuzatish': 'Follow',
  'Holat tarixi': 'Status history',
  'Izoh ustidan shikoyat': 'Report comment',
  "Hali izoh yo'q.": 'No comments yet.',
  'Yana izohlar': 'More comments',
  'Izoh qoldiring': 'Leave a comment',
  'Postdan shikoyat qilish': 'Report post',
  "Holat o'zgardi": 'Status changed',
  'Muallif natijani tasdiqladi': 'The author confirmed the result',
  "Keyingi davrga o'tkazildi": 'Moved to the next round',
  "Ma'lumotlar yangilandi": 'Details updated',
  'Fikringiz adminga yuborildi.': 'Your feedback was sent to the admin.',
  "Muammoni o'chirish": 'Delete issue',
  "Bu amalni qaytarib bo'lmaydi.": 'This can’t be undone.',
  'Tuzatib qayta yuborish': 'Fix and resubmit',
  'Admin izohi:': 'Admin’s note:',
  'Muammo qayta moderatsiyaga yuborildi.': 'The issue was sent back for review.',
  "O'zgarishlar saqlandi.": 'Changes saved.',
  "Bu muammoni endi tahrirlab bo'lmaydi.": 'This issue can no longer be edited.',
  'Muammoingiz moderatsiyaga tushdi. Tasdiqlangach ovozga chiqadi.': 'Your issue is in review. Once approved, it goes to the vote.',
  'Hali muammo yubormagansiz': 'You haven’t reported any issues yet',
  'Mahallangizdagi muammoni rasm bilan yuboring.': 'Report a problem in your mahalla with a photo.',
  'Mening muammolarim': 'My issues',
  'Sarlavha': 'Title',
  '5–120 belgi': '5–120 characters',
  'Tavsif': 'Description',
  "10–2000 belgi. Nima bo'lgan, qachondan beri?": '10–2000 characters. What happened, and since when?',
  'Joy': 'Location',
  "Jamoat joyi yoki mo'ljal (uy manzili yozmang)": 'A public place or landmark (not a home address)',
  'Toifa': 'Category',
  'Foto va video': 'Photos and video',
  'Ixtiyoriy. 3 tagacha rasm (har biri 5 MB gacha) va 1 ta video (25 MB gacha, ~60 soniya).':
    'Optional. Up to 3 photos (5 MB each) and 1 video (up to 25 MB, ~60 seconds).',
  'Galereya': 'Gallery',
  'Kamera': 'Camera',
  'Sozlamalarda kameraga ruxsat bering.': 'Allow camera access in Settings.',
  'Limit': 'Limit',
  "3 ta rasm va 1 ta video qo'shilgan.": '3 photos and 1 video already added.',
  "Faqat 1 ta video qo'shish mumkin": 'Only 1 video can be added',
  "Eng ko'pi bilan 3 ta rasm": 'Up to 3 photos',
  "Rasmni tayyorlab bo'lmadi": 'Couldn’t prepare the photo',
  "Ba'zi fayllar qo'shilmadi": 'Some files weren’t added',
  "Ba'zi fayllar yuklanmadi. “Qayta urinish” ni bosing yoki faylni olib tashlang.": 'Some files didn’t upload. Tap “Try again” or remove the file.',
  'Faylni olib tashlash': 'Remove file',
  'Muammo moderator tasdiqlagandan keyin ovoz berishga chiqadi.': 'The issue goes to the vote after a moderator approves it.',
  "Shoshilinch xavf bo'lsa, avval tezkor xizmatga qo'ng'iroq qiling": 'In an emergency, call the emergency services first',
  "Yong'in xizmati": 'Fire service',
  'Politsiya': 'Police',
  'Tez yordam': 'Ambulance',
  'Kelgusi': 'Upcoming',
  "O'tgan": 'Past',
  'kishi qatnashadi': 'people going',
  'Qatnashasiz (bekor qilish)': 'You’re going (cancel)',
  'Qatnashaman': 'I’m going',
  "O'tgan tadbirlar yo'q": 'No past events',
  "Kelgusi tadbirlar yo'q": 'No upcoming events',
  "Admin yangi tadbir nashr qilganda shu yerda ko'rinadi.": 'New events from the admin will appear here.',
  'Tadbir': 'Event',
  'Tadbir natijasi': 'Event result',
  'Bu tadbir bekor qilingan.': 'This event was cancelled.',
  'Qatnashasiz — bekor qilish': 'You’re going — cancel',
  'Qatnashish': 'Join',
  "E'lonlar yo'q": 'No announcements',
  "Admin e'lon nashr qilganda shu yerda ko'rinadi.": 'Announcements from the admin will appear here.',
  "E'lon": 'Announcement',
  "Hammasini o'qish": 'Mark all as read',
  "Bildirishnomalar yo'q": 'No notifications',
  "Post holati, g'olib muammo va tadbirlar haqida shu yerda xabar olasiz.": 'Updates on your posts, the winning issue and events will appear here.',
  'Ovoz davrlari': 'Voting rounds',
  'Oldingi ovoz davrlari': 'Past voting rounds',
  'Davr natijasi': 'Round result',
  "Davrlar yo'q": 'No rounds',
  "G'olib muammo": 'Winning issue',
  "Bu oy g'olib aniqlanmadi": 'No winner this month',
  'Muammoni ochish': 'Open issue',
  'Ovoz bergan aholi:': 'Residents who voted:',
  'Jami ovozlar:': 'Total votes:',
  "Hali xabar yo'q": 'No messages yet',
  "Birinchi bo'lib qo'shnilarga salom yozing.": 'Be the first to say hello to your neighbors.',
  'Xabar yozing…': 'Write a message…',
  'Yuborilmadi': 'Not sent',
  '↻ Qayta yuborish': '↻ Send again',
  'Shikoyat qilish uchun bosib turing': 'Press and hold to report',
  'Mahalla chati': 'Mahalla chat',
  'Admin bilan chat': 'Chat with the admin',
  'Admin': 'Admin',
  'Adminga yozing…': 'Write to the admin…',
  'Savol yoki taklifingizni yozing — admin shu yerda javob beradi.': 'Write a question or suggestion — the admin will reply here.',
  'Chiqish': 'Sign out',
  'Akkauntdan chiqmoqchimisiz?': 'Sign out of your account?',
  'Akkaunt': 'Account',
  'Telefon': 'Phone',
  'Sahifa topilmadi': 'Page not found',
  'Bosh sahifaga qaytish': 'Back to home',
  'Shikoyat qilish': 'Report',
  'Sababni tanlang. Admin ko‘rib chiqadi.': 'Choose a reason. The admin will review it.',
  'Shikoyatingiz adminga yuborildi.': 'Your report was sent to the admin.',
  "Yuborib bo'lmadi": 'Couldn’t send',
  'Spam yoki reklama': 'Spam or advertising',
  'Haqorat yoki tahdid': 'Insults or threats',
  "Noto'g'ri ma'lumot": 'False information',
  'Boshqa sabab': 'Other reason',
  'tugadi': 'ended',
  'hozirgina': 'just now',
  'yanvar': 'January', 'fevral': 'February', 'mart': 'March', 'aprel': 'April', 'may': 'May', 'iyun': 'June',
  'iyul': 'July', 'avgust': 'August', 'sentabr': 'September', 'oktabr': 'October', 'noyabr': 'November', 'dekabr': 'December',
  'daqiqa': 'min',
  'daqiqa oldin': 'min ago',
  'soat oldin': 'h ago',
  'kun oldin': 'days ago',
  'Admin bilan': 'With the admin',
  "Xabar yo'q": 'No messages',
  'Javob kutmoqda ·': 'Awaiting reply ·',
  "Hozircha suhbat yo'q. Aholi yozganda shu yerda ko'rinadi.": 'No conversations yet. They’ll appear here when residents write.',
  'Mahalla aholisi va admin ishtirok etadigan umumiy chat.': 'A shared chat for mahalla residents and the admin.',
  "Shaxsiy suhbat: faqat siz va mahalla admini ko'radi. Savol yoki taklifingizni yozing.":
    'Private chat: only you and your mahalla admin can see it. Write a question or suggestion.',
  'Savol yoki taklifingizni yuboring — admin shu yerda javob beradi.': 'Send a question or suggestion — the admin will reply here.',
  'Ha, chiqish': 'Yes, sign out',
  'Muallif: muammo davom etmoqda': 'Author: problem persists',
  '★ Kuzatilmoqda': '★ Following',
};

const EN: Record<string, string> = {};
for (const [k, v] of Object.entries(EN_RAW)) EN[norm(k)] = v;

const plural = (n: string, one: string, many: string) => `${n} ${n === '1' ? one : many}`;

const EN_PATTERNS: Array<[RegExp, (m: RegExpExecArray) => string]> = [
  [/^Salom, (.+)$/, (m) => `Hi, ${m[1]}`],
  [/^Holat: (.+)$/, (m) => `Status: ${tr(m[1] as string)}`],
  [/^(\d+) ovoz$/, (m) => plural(m[1] as string, 'vote', 'votes')],
  [/^Izohlar \((\d+)\)$/, (m) => `Comments (${m[1]})`],
  [/^(\d+) ta ovoz qoldi$/, (m) => `${plural(m[1] as string, 'vote', 'votes')} left`],
  [/^(\d+) ta qoldi$/, (m) => `${m[1]} left`],
  [/^(\d+) kishi qatnashadi$/, (m) => `${m[1]} going`],
  [/^(\d+) daqiqa oldin$/, (m) => `${m[1]} min ago`],
  [/^(\d+) soat oldin$/, (m) => `${m[1]} h ago`],
  [/^(\d+) kun oldin$/, (m) => `${plural(m[1] as string, 'day', 'days')} ago`],
  [/^(\d+) kun (\d+) soat$/, (m) => `${m[1]} d ${m[2]} h`],
  [/^(\d+) soat (\d+) daqiqa$/, (m) => `${m[1]} h ${m[2]} min`],
  [/^(\d+) daqiqa$/, (m) => `${m[1]} min`],
  [/^Yangi\. (.*)$/, (m) => `New. ${tr(m[1] as string)}`],
  [/^(.+) — (.+)ga qo'ng'iroq qilish$/, (m) => `${tr(m[1] as string)} — call ${m[2]}`],
  [/^Rasm ([\d.,]+) MB — 5 MB dan oshmasin$/, (m) => `Photo is ${m[1]} MB — keep it under 5 MB`],
  [/^Video ([\d.,]+) MB — 25 MB dan oshmasin$/, (m) => `Video is ${m[1]} MB — keep it under 25 MB`],
];

const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_RU = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const MONTHS_UZ = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];

/** Matnni joriy tilga o'giradi. Topilmasa — o'zbekcha (yoki kirill transliteratsiyasi). */
export function tr(text: string, lang: Lang = current): string {
  if (lang === 'uz' || !text) return text;
  const lead = /^\s*/.exec(text)?.[0] ?? '';
  const trail = /\s*$/.exec(text)?.[0] ?? '';
  const core = text.trim();
  if (!core) return text;
  if (lang === 'oz') return lead + toCyrillic(core) + trail;
  const en = lang === 'en';
  const key = norm(core);
  const dict = en ? EN : RU;
  const compact = key.replace(/\s+/g, ' ');
  // Labels split over lines ("Muammo\nyuborish") match their one-line key
  const hit = dict[key] ?? dict[compact];
  if (hit) return lead + hit + trail;
  for (const [re, fn] of en ? EN_PATTERNS : RU_PATTERNS) {
    const m = re.exec(compact);
    if (m) return lead + fn(m) + trail;
  }
  // Oy nomlari "12 yan 2026"
  const dm = /^(\d{1,2}) ([a-z]+) (\d{4})(.*)$/.exec(compact);
  if (dm) {
    const i = MONTHS_UZ.indexOf(dm[2] as string);
    if (i >= 0) {
      return en
        ? `${lead}${MONTHS_EN[i]} ${dm[1]}, ${dm[3]}${dm[4]}${trail}`
        : `${lead}${dm[1]} ${MONTHS_RU[i]} ${dm[3]}${dm[4]}${trail}`;
    }
  }
  return text;
}

interface LangValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** Komponentlar uchun: til o'zgarganda qayta chizishni ta'minlaydi */
  t: (text: string) => string;
}

const LangContext = createContext<LangValue>({ lang: 'uz', setLang: () => undefined, t: (s) => s });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('uz');

  useEffect(() => {
    void SecureStore.getItemAsync(KEY)
      .then((v) => {
        if (v === 'uz' || v === 'oz' || v === 'ru' || v === 'en') {
          current = v;
          setLangState(v);
        }
      })
      .catch(() => undefined);
  }, []);

  const setLang = useCallback((l: Lang) => {
    current = l;
    setLangState(l);
    void SecureStore.setItemAsync(KEY, l).catch(() => undefined);
  }, []);

  const value = useMemo<LangValue>(() => ({ lang, setLang, t: (s) => tr(s, lang) }), [lang, setLang]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);
export const currentLang = () => current;

// Alert.alert matnlari (sarlavha, xabar, tugmalar) ham joriy tilga o'giriladi
const rawAlert = Alert.alert.bind(Alert);
Alert.alert = (title, message, buttons, options) =>
  rawAlert(
    tr(title ?? ''),
    message ? tr(message) : message,
    buttons?.map((b) => (b.text ? { ...b, text: tr(b.text) } : b)),
    options,
  );
