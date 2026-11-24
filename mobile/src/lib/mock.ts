// Demo ma'lumotlar: EXPO_PUBLIC_SKIP_AUTH=true bo'lsa backend'siz dizaynni ko'rish uchun.
// Haqiqiy API ulanganda (SKIP_AUTH=false) bu fayl umuman ishlatilmaydi.
import type {
  Announcement,
  AppNotification,
  Category,
  ChatMessage,
  Comment,
  CurrentRound,
  EventDetail,
  Home,
  IssueDetail,
  IssueListItem,
  Me,
  RoundListItem,
  RoundResult,
} from './types';

const HOUR = 3_600_000;
const ago = (h: number) => new Date(Date.now() - h * HOUR).toISOString();
const ahead = (h: number) => new Date(Date.now() + h * HOUR).toISOString();
const img = (seed: string, w = 400, h = 300) => `https://picsum.photos/seed/${seed}/${w}/${h}`;

const mahalla = { id: 'm1', name: 'Navbahor mahallasi', slug: 'navbahor' };

const me: Me = {
  user: {
    id: 'u1',
    login: 'sardor.k',
    displayName: 'Sardor Karimov',
    phone: '+998 90 123 45 67',
    role: 'RESIDENT',
    mahalla,
  },
  mahalla,
  role: 'RESIDENT',
  mustChangePassword: false,
  unreadNotifications: 3,
};

const categories: Category[] = [
  { value: 'ROAD', label: "Yo'l va ko'cha" },
  { value: 'LIGHTING', label: "Ko'cha yoritgichi" },
  { value: 'WATER', label: 'Suv ta’minoti' },
  { value: 'WASTE', label: 'Chiqindi' },
  { value: 'GREEN', label: "Ko'kalamzor" },
  { value: 'SAFETY', label: 'Xavfsizlik' },
];

function issue(
  id: string,
  title: string,
  category: string,
  categoryLabel: string,
  locationText: string,
  status: string,
  statusLabel: string,
  voteCount: number | null,
  comments: number,
  hoursAgo: number,
  extra: Partial<IssueListItem> = {},
): IssueListItem {
  return {
    id,
    title,
    category,
    categoryLabel,
    locationText,
    status,
    statusLabel,
    publishedAt: ago(hoursAgo),
    createdAt: ago(hoursAgo + 2),
    commentCount: comments,
    voteCount,
    myVote: false,
    isFollowing: false,
    thumbUrl: img(id),
    authorName: 'Sardor Karimov',
    responsible: null,
    dueDate: null,
    hidden: false,
    rejectedReason: null,
    duplicateOf: null,
    ...extra,
  };
}

const issues: IssueListItem[] = [
  issue('i1', "Bog'ishamol ko'chasidagi chuqur yo'l", 'ROAD', "Yo'l va ko'cha", "Bog'ishamol ko'chasi, 14-uy", 'OPEN', 'Ovozga ochiq', 128, 14, 5, { myVote: true }),
  issue('i2', "Maktab yonidagi svetofor ishlamayapti", 'SAFETY', 'Xavfsizlik', '12-maktab oldi', 'OPEN', 'Ovozga ochiq', 96, 9, 20),
  issue('i3', "Chiqindi qutilari to'lib toshgan", 'WASTE', 'Chiqindi', 'Navoiy ko‘chasi, 3-blok', 'OPEN', 'Ovozga ochiq', 74, 6, 31),
  issue('i4', "Bolalar maydonchasi buzilgan", 'GREEN', "Ko'kalamzor", 'Yosh bog‘ yonida', 'OPEN', 'Ovozga ochiq', 51, 4, 52),
  issue('i5', "Ko'cha chiroqlari yonmayapti", 'LIGHTING', "Ko'cha yoritgichi", "Mustaqillik ko'chasi", 'SELECTED', "G'olib — tanlandi", 212, 21, 120, { responsible: 'Obodonlashtirish bo‘limi', dueDate: '2026-12-15' }),
  issue('i6', "Ichimlik suvi bosimi past", 'WATER', 'Suv ta’minoti', 'Chilonzor tor ko‘chasi', 'IN_PROGRESS', 'Bajarilmoqda', null, 11, 200),
];

const mine: IssueListItem[] = [
  { ...issues[0]!, myVote: false },
  issue('i7', "Yo'lak plitkalari singan", 'ROAD', "Yo'l va ko'cha", 'Gagarin ko‘chasi, 7', 'PENDING_REVIEW', 'Tekshiruvda', null, 0, 3),
  issue('i8', 'Reklama tashlandiqlari', 'WASTE', 'Chiqindi', 'Bozor yonida', 'REJECTED', 'Rad etildi', null, 0, 80, { rejectedReason: "Rasm aniq emas, iltimos qayta yuklang." }),
];

function detail(i: IssueListItem): IssueDetail {
  return {
    id: i.id,
    title: i.title,
    category: i.category,
    categoryLabel: i.categoryLabel,
    status: i.status,
    statusLabel: i.statusLabel,
    hidden: false,
    author: { id: 'u1', displayName: i.authorName },
    createdAt: i.createdAt,
    publishedAt: i.publishedAt,
    description:
      "Bu muammo mahalla aholisiga har kuni noqulaylik tug'dirmoqda. Bir necha oydan beri hal etilmagan. Iltimos, e'tibor bering va ovoz bering.",
    locationText: i.locationText,
    media: [
      {
        id: `${i.id}-m1`,
        kind: 'IMAGE',
        url: img(i.id, 900, 600),
        thumbUrl: img(i.id, 300, 200),
        width: 900,
        height: 600,
        mime: 'image/jpeg',
        sizeBytes: 120_000,
        expiresAt: ahead(1),
      },
      {
        id: `${i.id}-m2`,
        kind: 'IMAGE',
        url: img(`${i.id}b`, 900, 600),
        thumbUrl: img(`${i.id}b`, 300, 200),
        width: 900,
        height: 600,
        mime: 'image/jpeg',
        sizeBytes: 110_000,
        expiresAt: ahead(1),
      },
    ],
    voteCount: i.voteCount,
    roundId: 'r1',
    myVote: i.myVote,
    isFollowing: i.isFollowing,
    canVote: i.status === 'OPEN',
    commentCount: i.commentCount,
    duplicateOf: null,
    rejectedReason: i.rejectedReason,
    responsible: i.responsible,
    nextStep: i.responsible ? 'Materiallar yetkazib berilmoqda' : null,
    dueDate: i.dueDate,
    referredOrg: null,
    referredAt: null,
    followUpAt: null,
    resolutionText: null,
    hiddenReason: null,
    history: [
      {
        id: 'h1',
        type: 'STATUS_CHANGE',
        fromStatus: 'PENDING_REVIEW',
        toStatus: 'OPEN',
        reason: null,
        payload: {},
        createdAt: ago(40),
        actorName: 'Mahalla admini',
        media: [],
      },
    ],
  };
}

const comments: Comment[] = [
  { id: 'c1', text: "Men ham har kuni shu yerdan o'taman, juda xavfli.", authorId: 'u2', authorName: 'Dilnoza A.', createdAt: ago(4) },
  { id: 'c2', text: "Qo'llab-quvvatlayman, ovoz berdim!", authorId: 'u3', authorName: 'Jasur T.', createdAt: ago(2) },
];

const home: Home = {
  round: { periodEnd: ahead(24 * 9 + 5), votesLeft: 2 },
  featuredIssue: { id: 'i5', title: "Ko'cha chiroqlari yonmayapti", status: 'SELECTED', statusLabel: "G'olib — tanlandi" },
  nextEvent: { id: 'e1', title: 'Mahalla hasharı — ko‘kalamzorlashtirish', startsAt: ahead(60), location: 'Yosh bog‘ maydoni' },
  latestImportantAnnouncement: { id: 'a1', title: "Suv o'chirilishi haqida ogohlantirish", publishedAt: ago(6) },
  unreadNotifications: 3,
};

const round: CurrentRound = {
  round: { id: 'r1', status: 'OPEN', periodStart: ago(24 * 20), periodEnd: ahead(24 * 9 + 5) },
  periodStart: ago(24 * 20),
  periodEnd: ahead(24 * 9 + 5),
  votesUsed: 1,
  votesLeft: 2,
  myVotes: [{ issueId: 'i1', title: issues[0]!.title, slot: 1 }],
};

const rounds: RoundListItem[] = [
  { id: 'r0', status: 'CLOSED', periodStart: ago(24 * 50), periodEnd: ago(24 * 21), winner: { issueId: 'i5', title: issues[4]!.title, votes: 212 }, totalVoters: 340, totalVotes: 780 },
  { id: 'r-1', status: 'CLOSED', periodStart: ago(24 * 80), periodEnd: ago(24 * 51), winner: { issueId: 'i9', title: "Markaziy ko'cha asfaltlash", votes: 187 }, totalVoters: 298, totalVotes: 655 },
];

const roundResult: RoundResult = {
  roundId: 'r0',
  periodStart: ago(24 * 50),
  periodEnd: ago(24 * 21),
  closedAt: ago(24 * 21),
  winner: { rank: 1, title: issues[4]!.title, votes: 212, issueId: 'i5' },
  ranking: [
    { rank: 1, title: issues[4]!.title, votes: 212, issueId: 'i5' },
    { rank: 2, title: issues[0]!.title, votes: 128, issueId: 'i1' },
    { rank: 3, title: issues[1]!.title, votes: 96, issueId: 'i2' },
  ],
  totalVoters: 340,
  totalVotes: 780,
  message: "G'olib muammo mahalla rahbariyatiga hal qilish uchun yuborildi.",
};

const events: EventDetail[] = [
  {
    id: 'e1',
    title: 'Mahalla hashari — ko‘kalamzorlashtirish',
    description: "Yosh bog' maydonida ko'chat ekamiz va maydonchani tozalaymiz. Asboblar mahalla tomonidan beriladi.",
    startsAt: ahead(60),
    endsAt: ahead(64),
    location: "Yosh bog' maydoni",
    organizer: 'Mahalla qo‘mitasi',
    status: 'PUBLISHED',
    version: 1,
    resultText: null,
    rsvpCount: 42,
    myRsvp: true,
    createdAt: ago(100),
    media: [],
  },
  {
    id: 'e2',
    title: 'Yoshlar bilan uchrashuv',
    description: "Mahalla yoshlari uchun kasb-hunar va bandlik masalalari bo'yicha uchrashuv.",
    startsAt: ahead(24 * 6),
    endsAt: null,
    location: 'Mahalla markazi, 2-qavat',
    organizer: 'Yoshlar ittifoqi',
    status: 'PUBLISHED',
    version: 1,
    resultText: null,
    rsvpCount: 18,
    myRsvp: false,
    createdAt: ago(60),
    media: [],
  },
  {
    id: 'e3',
    title: 'Sog‘liqni tekshirish kuni',
    description: 'Poliklinika shifokorlari bepul ko‘rikdan o‘tkazadi.',
    startsAt: ago(24 * 10),
    endsAt: null,
    location: 'Mahalla markazi',
    organizer: 'Oilaviy poliklinika',
    status: 'COMPLETED',
    version: 2,
    resultText: '120 nafar aholi ko‘rikdan o‘tdi.',
    rsvpCount: 120,
    myRsvp: true,
    createdAt: ago(24 * 20),
    media: [],
  },
];

const announcements: Announcement[] = [
  { id: 'a1', title: "Suv o'chirilishi haqida ogohlantirish", body: "Ertaga soat 09:00 dan 14:00 gacha ta'mirlash ishlari sababli ichimlik suvi o'chiriladi. Zaxira tayyorlab qo'ying.", isImportant: true, status: 'PUBLISHED', publishedAt: ago(6), createdAt: ago(7) },
  { id: 'a2', title: "Yangi oyning ovoz berish davri boshlandi", body: "Har bir aholi oyiga 3 tagacha ovoz berishi mumkin. Faol bo'ling!", isImportant: false, status: 'PUBLISHED', publishedAt: ago(48), createdAt: ago(49) },
  { id: 'a3', title: 'Chiqindi olib ketish jadvali o‘zgardi', body: 'Chiqindi endi dushanba, chorshanba va juma kunlari olib ketiladi.', isImportant: false, status: 'PUBLISHED', publishedAt: ago(100), createdAt: ago(101) },
];

const notifications: AppNotification[] = [
  { id: 'n1', type: 'ISSUE_STATUS', title: "Muammo yangi holatda", body: "«Ko'cha chiroqlari yonmayapti» g'olib deb tanlandi.", entityType: 'ISSUE', entityId: 'i5', read: false, readAt: null, createdAt: ago(3) },
  { id: 'n2', type: 'ANNOUNCEMENT', title: "Yangi muhim e'lon", body: "Suv o'chirilishi haqida ogohlantirish", entityType: 'ANNOUNCEMENT', entityId: 'a1', read: false, readAt: null, createdAt: ago(6) },
  { id: 'n3', type: 'EVENT', title: 'Tadbir eslatmasi', body: 'Mahalla hashari 2 kundan keyin.', entityType: 'EVENT', entityId: 'e1', read: false, readAt: null, createdAt: ago(20) },
  { id: 'n4', type: 'ISSUE_STATUS', title: 'Muammongiz qabul qilindi', body: "«Bog'ishamol ko'chasidagi chuqur yo'l» ovozga qo'yildi.", entityType: 'ISSUE', entityId: 'i1', read: true, readAt: ago(30), createdAt: ago(40) },
];

// Eng yangisi birinchi (backend tartibi). id — o'sish tartibidagi raqam: `after=` shu bo'yicha filtrlanadi.
let chatSeq = 10;
const chatNo = (id: string) => Number(id.replace('cm', ''));
const adminMsg = (text: string, h: number): ChatMessage => ({
  id: `cm${++chatSeq}`, text, senderId: 'a1', senderName: 'Mahalla admini', senderRole: 'MAHALLA_ADMIN', mine: false, createdAt: ago(h),
});
const chat: ChatMessage[] = [
  { id: 'cm4', text: 'Ha, men qatnashaman', senderId: 'u1', senderName: 'Sardor Karimov', senderRole: 'RESIDENT', mine: true, createdAt: ago(4) },
  { id: 'cm3', text: 'Vaalaykum assalom. Hashar haqida eshitdingizmi?', senderId: 'u3', senderName: 'Jasur T.', senderRole: 'RESIDENT', mine: false, createdAt: ago(4.5) },
  { id: 'cm2', text: 'Hashar shanba kuni soat 9:00 da.', senderId: 'a1', senderName: 'Mahalla admini', senderRole: 'MAHALLA_ADMIN', mine: false, createdAt: ago(4.8) },
  { id: 'cm1', text: 'Assalomu alaykum, qo‘shnilar!', senderId: 'u2', senderName: 'Dilnoza A.', senderRole: 'RESIDENT', mine: false, createdAt: ago(5) },
];
const support: ChatMessage[] = [
  { id: 'cm8', text: 'Salom! Savol yoki taklifingiz bo‘lsa shu yerga yozing — javob beraman.', senderId: 'a1', senderName: 'Mahalla admini', senderRole: 'MAHALLA_ADMIN', mine: false, createdAt: ago(3) },
];

/** Demo: yuborilgan xabar ro'yxatga qo'shiladi; admin 2 soniyadan keyin javob yozadi. */
function postChat(list: ChatMessage[], text: string, reply: string): ChatMessage {
  const mineMsg: ChatMessage = {
    id: `cm${++chatSeq}`,
    text,
    senderId: 'u1',
    senderName: me.user.displayName,
    senderRole: 'RESIDENT',
    mine: true,
    createdAt: new Date().toISOString(),
  };
  list.unshift(mineMsg);
  setTimeout(() => list.unshift(adminMsg(reply, 0)), 2000);
  return mineMsg;
}

function chatPage(list: ChatMessage[], params: URLSearchParams) {
  const after = params.get('after');
  if (after) return page(list.filter((m) => chatNo(m.id) > chatNo(after)).reverse());
  return page(list);
}

const page = <T,>(items: T[]) => ({ items, nextCursor: null });

/** `undefined` qaytsa — yo'l demo'da yo'q. Mutatsiyalar uchun ishonarli javob qaytariladi. */
export function mockResponse(path: string, method = 'GET', body?: unknown): unknown {
  const [pathname = '', query = ''] = path.split('?');
  const params = new URLSearchParams(query);

  if (method !== 'GET') {
    if (/\/vote$/.test(pathname)) {
      return method === 'PUT'
        ? { issueId: pathname.split('/')[2], voted: true, slot: 2, votesUsed: 2, votesLeft: 1 }
        : undefined;
    }
    if (/\/rsvp$/.test(pathname)) return { going: method === 'PUT', rsvpCount: 43 };
    if (pathname === '/issues') return detail(mine[1]!);
    if (/\/comments$/.test(pathname)) {
      return { id: `c${Date.now()}`, text: 'Izoh', authorId: 'u1', authorName: me.user.displayName, createdAt: new Date().toISOString() };
    }
    const sent = String((body as { text?: string } | undefined)?.text ?? '');
    if (pathname === '/chat/messages') return postChat(chat, sent, 'Rahmat, xabaringiz qabul qilindi.');
    if (pathname === '/support/messages') return postChat(support, sent, 'Rahmat, murojaatingiz qabul qilindi. Tez orada ko‘rib chiqamiz.');
    if (pathname === '/auth/login') return { token: 'demo', mustChangePassword: false };
    return undefined;
  }

  if (pathname === '/me') return me;
  if (pathname === '/home') return home;
  if (pathname === '/categories') return categories;
  if (pathname === '/issues/mine') return page(mine);
  if (pathname === '/issues') {
    const cat = params.get('category');
    const status = params.get('status');
    let list = issues;
    if (cat) list = list.filter((i) => i.category === cat);
    if (status) list = list.filter((i) => i.status === status);
    return page(list);
  }
  const issueM = /^\/issues\/([^/]+)$/.exec(pathname);
  if (issueM) {
    const found = [...issues, ...mine].find((i) => i.id === issueM[1]);
    return found ? detail(found) : detail(issues[0]!);
  }
  if (/^\/issues\/[^/]+\/comments$/.test(pathname)) return page(comments);
  if (pathname === '/rounds/current') return round;
  if (pathname === '/rounds') return page(rounds);
  if (/^\/rounds\/[^/]+\/result$/.test(pathname)) return roundResult;
  if (pathname === '/events') {
    const past = params.get('scope') === 'past';
    return page(events.filter((e) => (e.status === 'COMPLETED') === past));
  }
  const evM = /^\/events\/([^/]+)$/.exec(pathname);
  if (evM) return events.find((e) => e.id === evM[1]) ?? events[0];
  if (pathname === '/announcements') return page(announcements);
  const anM = /^\/announcements\/([^/]+)$/.exec(pathname);
  if (anM) return announcements.find((a) => a.id === anM[1]) ?? announcements[0];
  if (pathname === '/notifications') return page(notifications);
  if (pathname === '/chat/messages') return chatPage(chat, params);
  if (pathname === '/support/messages') return chatPage(support, params);
  return undefined;
}
