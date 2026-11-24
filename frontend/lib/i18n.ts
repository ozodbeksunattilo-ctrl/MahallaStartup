'use client';

import { useSyncExternalStore } from 'react';

/** uz — o'zbek (lotin, manba til), ru — rus. Manba matnlar o'zbek lotinida yoziladi. */
export type Lang = 'uz' | 'ru';

export const LANGS: Array<{ code: Lang; label: string }> = [
  { code: 'uz', label: 'UZ' },
  { code: 'ru', label: 'RU' },
];

const KEY = 'mhd_lang';
let current: Lang = 'uz';
let loaded = false;
const listeners = new Set<() => void>();

function load(): void {
  if (loaded || typeof window === 'undefined') return;
  loaded = true;
  try {
    if (window.localStorage.getItem(KEY) === 'ru') current = 'ru';
  } catch {
    // localStorage yopiq bo'lsa (maxfiy rejim) — o'zbekcha qoladi
  }
}

export function getLang(): Lang {
  load();
  return current;
}

export function setLang(lang: Lang): void {
  load();
  if (lang === current) return;
  current = lang;
  try {
    window.localStorage.setItem(KEY, lang);
  } catch {
    // saqlanmasa ham joriy sessiyada ishlaydi
  }
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Joriy til; til o'zgarganda komponent qayta chiziladi. */
export function useLang(): Lang {
  return useSyncExternalStore(subscribe, getLang, () => 'uz');
}

// ---------- Tarjima ----------

const norm = (s: string) => s.replace(/&apos;/g, "'").replace(/[ʻʼ’‘`´]/g, "'").replace(/\s+/g, ' ').trim();

const RU: Record<string, string> = {
  // Navigatsiya
  'Umumiy': 'Общее',
  'Bosh sahifa': 'Главная',
  'Chat': 'Чат',
  'Moderatsiya': 'Модерация',
  'Moderatsiya navbati': 'Очередь модерации',
  'Shikoyatlar': 'Жалобы',
  'Muammolar': 'Проблемы',
  'Barcha muammolar': 'Все проблемы',
  'Ovoz davrlari': 'Периоды голосования',
  'Mahalla': 'Махалля',
  "Kirish so'rovlari": 'Запросы на доступ',
  'Aholi': 'Жители',
  'Tadbirlar': 'Мероприятия',
  "E'lonlar": 'Объявления',
  'Tizim': 'Система',
  'Audit jurnali': 'Журнал аудита',
  'Mahalladosh': 'Махаллядош',
  // Kirish
  'Xush kelibsiz': 'Добро пожаловать',
  'Mahalla admini sifatida tizimga kiring': 'Войдите в систему как администратор махалли',
  'Mahallamiz — bizning kuchimiz': 'Наша махалля — наша сила',
  'Login': 'Логин',
  'Login:': 'Логин:',
  'Parol': 'Пароль',
  'Parol:': 'Пароль:',
  "Ko'rsat": 'Показать',
  'Yashir': 'Скрыть',
  'Kirish': 'Войти',
  'Kirilmoqda...': 'Вход...',
  'Caps Lock yoqilgan': 'Включён Caps Lock',
  "Serverga ulanib bo'lmadi": 'Не удалось подключиться к серверу',
  // Yuqori panel va chiqish oynasi
  'Mahalla admini': 'Администратор махалли',
  'Parolni almashtirish': 'Сменить пароль',
  'Chiqish': 'Выйти',
  'Chiqmoqchimisiz?': 'Выйти из системы?',
  "Ko'rishguncha!": 'До свидания!',
  'Sessiya yopilmoqda… Yana kutib qolamiz.': 'Сессия закрывается… Ждём вас снова.',
  'Ha, chiqaman': 'Да, выйти',
  'Qolaman': 'Остаться',
  'Bekor qilish': 'Отмена',
  'Bu panel faqat mahalla adminlari uchun.': 'Эта панель только для администраторов махалли.',
  // Bosh sahifa
  "Mahalla holatining qisqacha ko'rinishi": 'Краткий обзор состояния махалли',
  'Faol ovoz beruvchilar': 'Активные голосующие',
  'Joriy davrda ovoz bergan aholi': 'Жители, проголосовавшие в текущем периоде',
  'Moderatsiya kutmoqda': 'Ожидает модерации',
  'Tasdiqlanmagan muammolar': 'Неподтверждённые проблемы',
  "Muddati o'tgan ishlar": 'Просроченные работы',
  "Muddat yoki keyingi tekshiruv sanasi o'tgan": 'Срок или дата следующей проверки истекли',
  'Ochiq shikoyatlar': 'Открытые жалобы',
  "Ko'rib chiqilmagan shikoyatlar": 'Нерассмотренные жалобы',
  'Joriy ovoz berish davri': 'Текущий период голосования',
  'Boshlanishi': 'Начало',
  'Tugashi': 'Окончание',
  'Holat': 'Статус',
  'Yaqin tadbir': 'Ближайшее мероприятие',
  'Nomi': 'Название',
  'Vaqti': 'Время',
  'Joy': 'Место',
  'Yozilganlar': 'Записавшиеся',
  'Tadbirni ochish': 'Открыть мероприятие',
  "Faol davr yo'q.": 'Активного периода нет.',
  "Yaqin tadbir yo'q.": 'Ближайших мероприятий нет.',
  'Yuklanmoqda…': 'Загрузка…',
  // Umumiy so'zlar
  'Hammasi': 'Все',
  'Barcha holatlar': 'Все статусы',
  'Ha': 'Да',
  "Yo'q": 'Нет',
  'Amallar': 'Действия',
  'Ochish': 'Открыть',
  'Yopish': 'Закрыть',
  'Saqlash': 'Сохранить',
  'Yuborish': 'Отправить',
  'Bekor': 'Отмена',
  'Qayta urinish': 'Повторить',
  'Tasdiqlash': 'Подтвердить',
  'Rad etish': 'Отклонить',
  'Yashirish': 'Скрыть',
  'Yashirishni bekor qilish': 'Показать снова',
  'Birlashtirish': 'Объединить',
  'Yakunlash': 'Завершить',
  'Bloklash': 'Заблокировать',
  'Blokdan chiqarish': 'Разблокировать',
  'Nashr qilish': 'Опубликовать',
  'Qoralama sifatida saqlash': 'Сохранить как черновик',
  'Bosh sahifaga qaytish': 'Вернуться на главную',
  'Sahifa topilmadi': 'Страница не найдена',
  'Xatolik yuz berdi': 'Произошла ошибка',
  'Kutilmagan xato yuz berdi': 'Произошла непредвиденная ошибка',
  'Boshqa': 'Другое',
  'Boshqa amallar': 'Другие действия',
  // Holatlar
  'Moderatsiyada': 'На модерации',
  'Ovoz berilmoqda': 'Идёт голосование',
  'Oylik ovozda tanlandi': 'Выбрано в месячном голосовании',
  'Jarayonda': 'В работе',
  'Tashkilotdan javob kutilmoqda': 'Ожидается ответ организации',
  'Hal qilingan': 'Решено',
  'Tuzatish kerak': 'Нужно исправить',
  'Birlashtirilgan': 'Объединено',
  'Qoralama': 'Черновик',
  'Nashr qilingan': 'Опубликовано',
  'Bekor qilingan': 'Отменено',
  'Yakunlangan': 'Завершено',
  'Ochiq': 'Открыто',
  'Yopilgan': 'Закрыто',
  "Choralar ko'rilgan": 'Меры приняты',
  'Rad etilgan': 'Отклонено',
  'Kutilmoqda': 'Ожидает',
  'Kutilayotgan': 'Ожидающие',
  'Tasdiqlangan': 'Подтверждено',
  'Faol': 'Активен',
  'Bloklangan': 'Заблокирован',
  'Muhim': 'Важно',
  'Yashirin': 'Скрыто',
  'Vaqtinchalik parol': 'Временный пароль',
  // Toifalar
  "Yo'l": 'Дорога',
  'Yoritish': 'Освещение',
  'Chiqindi': 'Мусор',
  'Suv': 'Вода',
  'Obodonlashtirish': 'Благоустройство',
  // Muammolar
  'Mahalladagi barcha muammolar va ularning holati': 'Все проблемы махалли и их статус',
  'Faqat muddati o\'tganlar': 'Только просроченные',
  'Sarlavha': 'Заголовок',
  'Toifa': 'Категория',
  'Ovozlar': 'Голоса',
  "Mas'ul": 'Ответственный',
  'Muddat': 'Срок',
  'Muallif': 'Автор',
  'Yuborilgan': 'Отправлено',
  'Yuborilgan sana': 'Дата отправки',
  'Nashr': 'Публикация',
  'Rad sababi': 'Причина отказа',
  'Dublikat': 'Дубликат',
  'Izohlar': 'Комментарии',
  'Izoh': 'Комментарий',
  'Holat tarixi': 'История статусов',
  'Holatni o\'tkazish': 'Сменить статус',
  'Yangi holat': 'Новый статус',
  "O'zgartirish sababi": 'Причина изменения',
  'Ish holati': 'Статус работы',
  "Ish ma'lumotlarini o'zgartirish": 'Изменить данные работы',
  'Bajarilgan ish': 'Выполненная работа',
  'Keyingi qadam': 'Следующий шаг',
  'Keyingi tekshiruv': 'Следующая проверка',
  'Tashkilot': 'Организация',
  'Yakunlash: natija matni (ixtiyoriy)': 'Завершение: текст результата (необязательно)',
  "Asosiy muammo ID (dublikat bo'lsa)": 'ID основной проблемы (если дубликат)',
  'Tasdiqlanmagan muammolar (eskisi birinchi)': 'Неподтверждённые проблемы (сначала старые)',
  'Rad etilgan sababi': 'Причина отказа',
  // Shikoyatlar
  'Aholi yuborgan kontent shikoyatlari': 'Жалобы жителей на контент',
  'Chat xabari': 'Сообщение чата',
  'Kim': 'Кто',
  'Sabab': 'Причина',
  'Sana': 'Дата',
  // Ovoz davrlari
  'Oylik ovoz berish davrlari va natijalari': 'Ежемесячные периоды голосования и их итоги',
  'Davr natijasi': 'Итоги периода',
  'Davrlarga qaytish': 'К периодам',
  'Reyting': 'Рейтинг',
  "Reyting yo'q": 'Рейтинга нет',
  'Natija': 'Результат',
  'Davr': 'Период',
  'G\'olib': 'Победитель',
  // Kirish so'rovlari
  "Mobil ilovadan kelgan ro'yxatdan o'tish so'rovlari. Tasdiqlasangiz akkaunt va vaqtinchalik parol yaratiladi.":
    'Запросы на регистрацию из мобильного приложения. После подтверждения создаются аккаунт и временный пароль.',
  "Akkaunt yaratildi — parolni hozir saqlang (qayta ko'rsatilmaydi)": 'Аккаунт создан — сохраните пароль сейчас (повторно не показывается)',
  "So'rov yo'q": 'Запросов нет',
  "Yangi so'rovlar mobil ilovadan kelganda shu yerda paydo bo'ladi.": 'Новые запросы из мобильного приложения появятся здесь.',
  'Ism': 'Имя',
  'Telefon': 'Телефон',
  'Manzil': 'Адрес',
  // Aholi
  "Mahalla a'zolari. Akkauntlarni faqat admin yaratadi.": 'Жители махалли. Аккаунты создаёт только администратор.',
  'Yangi aholi': 'Новый житель',
  'Ism va familiya': 'Имя и фамилия',
  'Ism, login yoki telefon': 'Имя, логин или телефон',
  'Telefon (ixtiyoriy)': 'Телефон (необязательно)',
  'Faqat aloqa uchun, kirish uchun emas': 'Только для связи, не для входа',
  'Akkaunt yaratish': 'Создать аккаунт',
  "Akkaunt yaratiladi va vaqtinchalik parol (72 soat) bir marta ko'rsatiladi": 'Аккаунт будет создан, временный пароль (72 часа) показывается один раз',
  'Akkaunt yaratilgach parol shu yerda': 'После создания аккаунта пароль появится здесь',
  'Parolni tiklash': 'Сбросить пароль',
  'Amal qilish muddati:': 'Срок действия:',
  'Joriy (vaqtinchalik) parol': 'Текущий (временный) пароль',
  'Yangi vaqtinchalik parol:': 'Новый временный пароль:',
  "3–32 belgi: kichik lotin harflari, raqam, nuqta, pastki chiziq": '3–32 символа: строчные латинские буквы, цифры, точка, подчёркивание',
  // Tadbirlar
  'Mahalla tadbirlari': 'Мероприятия махалли',
  'Yangi tadbir': 'Новое мероприятие',
  'Boshlanish vaqti': 'Время начала',
  'Tugash vaqti (ixtiyoriy)': 'Время окончания (необязательно)',
  'Tashkilotchi': 'Организатор',
  'Tavsif': 'Описание',
  "Hali yozilganlar yo'q": 'Пока никто не записался',
  // E'lonlar
  "Mahalla a'zolariga e'lonlar": 'Объявления для жителей махалли',
  "Yangi e'lon": 'Новое объявление',
  "E'lon": 'Объявление',
  'Matn': 'Текст',
  // Audit
  'Admin amallari tarixi': 'История действий администратора',
  "Amal bo'yicha filtr (masalan, issue.approve)": 'Фильтр по действию (например, issue.approve)',
  'Vaqt': 'Время',
  'Amal': 'Действие',
  "Ma'lumotlar": 'Данные',
  // Chat
  'Mahalla chati': 'Чат махалли',
  'Umumiy kanal': 'Общий канал',
  "Aholining adminga yozgan xabarlari va umumiy mahalla chati": 'Сообщения жителей администратору и общий чат махалли',
  "Hali shaxsiy murojaat yo'q.": 'Личных обращений пока нет.',
  "Hali xabar yo'q.": 'Сообщений пока нет.',
  'Javob kutmoqda': 'Ожидает ответа',
  'Xabar yozing…': 'Напишите сообщение…',
  // Jadval ustunlari
  "Qo'shilgan": 'Присоединился',
  'Boshlanish': 'Начало',
  'Ovoz berganlar': 'Проголосовали',
  'Jami ovoz': 'Всего голосов',
  // Interaktiv elementlar
  'Qidirish': 'Поиск',
  'Qidirish…': 'Поиск…',
  'Sahifa yoki amalni yozing…': 'Введите страницу или действие…',
  'Hech narsa topilmadi': 'Ничего не найдено',
  'Yaratish': 'Создать',
  "Yig'ish": 'Свернуть',
  "Menyuni yig'ish": 'Свернуть меню',
  'Menyuni ochish': 'Развернуть меню',
  'Bugun': 'Сегодня',
  'Ovoz davri bugun tugaydi': 'Период голосования заканчивается сегодня',
  'Til': 'Язык',
  // Parol
  'Yangi parol': 'Новый пароль',
  'Yangi parolni takrorlang': 'Повторите новый пароль',
  'Kamida 8 belgi': 'Не менее 8 символов',
};

/** Interpolyatsiyali matnlar */
const PATTERNS: Array<[RegExp, (m: RegExpExecArray) => string]> = [
  [/^(.+), tizimdan chiqsangiz, qayta kirish uchun login va parol kerak bo'ladi\.$/, (m) => `${m[1]}, после выхода для входа потребуются логин и пароль.`],
  [/^Qadam (\d+) \/ (\d+)$/, (m) => `Шаг ${m[1]} из ${m[2]}`],
  [/^Salom, (.+)$/, (m) => `Здравствуйте, ${m[1]}`],
  [/^Ovoz davri tugashiga (\d+) kun$/, (m) => `До конца периода голосования: ${m[1]} дн.`],
  [/^(\d+) kundan keyin$/, (m) => `Через ${m[1]} дн.`],
  [/^(\d+) ta$/, (m) => `${m[1]} шт.`],
];

const MONTHS: Record<string, string> = {
  yanvar: 'января', fevral: 'февраля', mart: 'марта', aprel: 'апреля', may: 'мая', iyun: 'июня',
  iyul: 'июля', avgust: 'августа', sentabr: 'сентября', oktabr: 'октября', noyabr: 'ноября', dekabr: 'декабря',
};

/** O'zbekcha matnni ruschaga o'giradi; lug'atda yo'q bo'lsa asl matnni qaytaradi. */
export function translate(text: string): string {
  const core = text.trim();
  if (!core) return text;
  const lead = /^\s*/.exec(text)?.[0] ?? '';
  const trail = /\s*$/.exec(text)?.[0] ?? '';
  const key = norm(core);
  const hit = RU[key];
  if (hit) return lead + hit + trail;
  for (const [re, fn] of PATTERNS) {
    const m = re.exec(key);
    if (m) return lead + fn(m) + trail;
  }
  const dm = /^(\d{1,2})[- ]([a-z]+)(.*)$/i.exec(key);
  const month = dm?.[2] ? MONTHS[dm[2].toLowerCase()] : undefined;
  if (dm && month) return `${lead}${dm[1]} ${month}${dm[3] ?? ''}${trail}`;
  return text;
}
