import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

/** uz — o'zbek (lotin), oz — o'zbek (kirill), ru — rus. Manba matnlar o'zbek lotinida yoziladi. */
export type Lang = 'uz' | 'oz' | 'ru';

export const LANGS: Array<{ code: Lang; label: string }> = [
  { code: 'uz', label: "O'zbekcha" },
  { code: 'oz', label: 'Ўзбекча' },
  { code: 'ru', label: 'Русский' },
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
  const key = norm(core);
  const hit = RU[key];
  if (hit) return lead + hit + trail;
  const compact = key.replace(/\s+/g, ' ');
  for (const [re, fn] of RU_PATTERNS) {
    const m = re.exec(compact);
    if (m) return lead + fn(m) + trail;
  }
  // Oy nomlari "12 yan 2026"
  const dm = /^(\d{1,2}) ([a-z]+) (\d{4})(.*)$/.exec(compact);
  if (dm) {
    const i = MONTHS_UZ.indexOf(dm[2] as string);
    if (i >= 0) return `${lead}${dm[1]} ${MONTHS_RU[i]} ${dm[3]}${dm[4]}${trail}`;
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
        if (v === 'uz' || v === 'oz' || v === 'ru') {
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
