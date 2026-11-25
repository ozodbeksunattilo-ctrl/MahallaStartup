import type { Queryable } from '../core/db';
import type { Deps } from '../core/deps';
import { uuidv7 } from '../core/ids';
import { notify } from '../core/notify';
import { hashPassword } from '../core/password';
import { fanoutAnnouncement } from '../modules/announcements/routes';
import { periodFor, weekPeriodFor, type Period, type RoundKind } from '../modules/rounds/period';
import { audit } from '../core/audit';
import type { Category, IssueStatus } from '../core/types';
import { demoPhoto, illustration, SCENE_PHOTO, type DemoPhoto, type Scene } from './illustrations';

export const DEMO_PASSWORD = 'Demo12345!';
export const DEMO_TEMP_PASSWORD = 'Temp12345!';

const DEMOS = [
  { slug: 'demo-yunusobod', name: 'Demo Yunusobod', key: 'yunusobod' },
  { slug: 'demo-chilonzor', name: 'Demo Chilonzor', key: 'chilonzor' },
] as const;

const RESIDENTS = [
  { key: 'ali', name: 'Ali Valiyev', mustChange: false },
  { key: 'vali', name: 'Vali Aliyev', mustChange: false },
  { key: 'sara', name: 'Sara Karimova', mustChange: false },
  // Birinchi kirish oqimi uchun: vaqtinchalik parol, majburiy almashtirish
  { key: 'dilnoza', name: 'Dilnoza Rahimova', mustChange: true },
] as const;

const DAY = 86_400_000;

interface IssueSeed {
  mahallaId: string;
  authorId: string;
  title: string;
  description: string;
  category: Category;
  status: IssueStatus;
  createdAt: Date;
  publishedAt?: Date | null;
  /** Standart — oylik */
  roundKind?: RoundKind;
  rejectedReason?: string;
  duplicateOfId?: string;
  responsible?: string;
  nextStep?: string;
  dueDate?: string;
  referredOrg?: string;
  referredAt?: string;
  followUpAt?: string;
  resolutionText?: string;
}

const day = (d: Date): string => d.toISOString().slice(0, 10);

async function mkIssue(q: Queryable, o: IssueSeed): Promise<string> {
  const id = uuidv7();
  await q.query(
    `INSERT INTO issues (id, mahalla_id, author_id, title, description, category, location_text, status, published_at,
                         rejected_reason, duplicate_of_id, responsible, next_step, due_date, referred_org, referred_at,
                         follow_up_at, resolution_text, idempotency_key, created_at, updated_at, round_kind)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::date, $15, $16::date, $17::date, $18, $19, $20, $20, $21)`,
    [
      id, o.mahallaId, o.authorId, o.title, o.description, o.category, 'Mahalla markazi, 12-uy yonida', o.status,
      o.publishedAt ?? null, o.rejectedReason ?? null, o.duplicateOfId ?? null, o.responsible ?? null, o.nextStep ?? null,
      o.dueDate ?? null, o.referredOrg ?? null, o.referredAt ?? null, o.followUpAt ?? null, o.resolutionText ?? null,
      `seed-${id}`, o.createdAt, o.roundKind ?? 'MONTHLY',
    ],
  );
  return id;
}

async function mkUpdate(
  q: Queryable,
  issueId: string,
  actorId: string | null,
  from: string | null,
  to: string | null,
  reason: string | null,
  at: Date,
  type: 'STATUS_CHANGE' | 'DETAILS_CHANGE' | 'AUTHOR_FEEDBACK' | 'CARRY_OVER' = 'STATUS_CHANGE',
): Promise<string> {
  const id = uuidv7();
  await q.query(
    `INSERT INTO issue_updates (id, issue_id, actor_id, type, from_status, to_status, reason, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [id, issueId, actorId, type, from, to, reason, at],
  );
  return id;
}

async function mkRound(
  q: Queryable,
  mahallaId: string,
  p: Period,
  status: 'OPEN' | 'CLOSED',
  kind: RoundKind = 'MONTHLY',
): Promise<string> {
  const id = uuidv7();
  await q.query(
    `INSERT INTO voting_rounds (id, mahalla_id, kind, period_start, period_end, status) VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, mahallaId, kind, p.start, p.end, status],
  );
  return id;
}

/** Ovozlar (har ovoz beruvchi uchun slot 1..3) va `round_entries.vote_count`. */
async function mkVotes(
  q: Queryable,
  roundId: string,
  entries: Array<{ issueId: string; voters: string[] }>,
  at: Date,
): Promise<void> {
  const slots = new Map<string, number>();
  for (const e of entries) {
    await q.query(
      `INSERT INTO round_entries (id, round_id, issue_id, vote_count, added_at) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (round_id, issue_id) DO UPDATE SET vote_count = EXCLUDED.vote_count`,
      [uuidv7(), roundId, e.issueId, e.voters.length, at],
    );
    for (const voter of e.voters) {
      const slot = (slots.get(voter) ?? 0) + 1;
      slots.set(voter, slot);
      await q.query(
        'INSERT INTO votes (id, round_id, issue_id, voter_id, slot, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
        [uuidv7(), roundId, e.issueId, voter, slot, at],
      );
    }
  }
}

/** Demo mahallalarning eski ma'lumotlarini FK tartibida tozalaydi (haqiqiy yozuvlarga tegmaydi). */
async function wipeMahalla(deps: Deps, q: Queryable, mahallaId: string): Promise<void> {
  const files = await q.query<{ storage_key: string; thumb_key: string | null }>(
    'SELECT storage_key, thumb_key FROM media WHERE mahalla_id = $1',
    [mahallaId],
  );
  for (const f of files.rows) {
    await deps.storage.delete(f.storage_key).catch(() => undefined);
    if (f.thumb_key) await deps.storage.delete(f.thumb_key).catch(() => undefined);
  }
  const users = (await q.query<{ user_id: string }>('SELECT user_id FROM memberships WHERE mahalla_id = $1', [mahallaId])).rows.map(
    (r) => r.user_id,
  );
  const steps = [
    'DELETE FROM access_requests WHERE mahalla_id = $1',
    'DELETE FROM notifications WHERE mahalla_id = $1',
    'DELETE FROM reports WHERE mahalla_id = $1',
    'DELETE FROM audit_events WHERE mahalla_id = $1',
    'DELETE FROM chat_messages WHERE mahalla_id = $1',
    'DELETE FROM support_messages WHERE mahalla_id = $1',
    'DELETE FROM comments WHERE mahalla_id = $1',
    'DELETE FROM votes WHERE round_id IN (SELECT id FROM voting_rounds WHERE mahalla_id = $1)',
    'DELETE FROM round_results WHERE round_id IN (SELECT id FROM voting_rounds WHERE mahalla_id = $1)',
    'DELETE FROM round_entries WHERE round_id IN (SELECT id FROM voting_rounds WHERE mahalla_id = $1)',
    'DELETE FROM voting_rounds WHERE mahalla_id = $1',
    'DELETE FROM issue_follows WHERE issue_id IN (SELECT id FROM issues WHERE mahalla_id = $1)',
    'DELETE FROM media WHERE mahalla_id = $1',
    'DELETE FROM issue_updates WHERE issue_id IN (SELECT id FROM issues WHERE mahalla_id = $1)',
    'UPDATE issues SET duplicate_of_id = NULL WHERE mahalla_id = $1',
    'DELETE FROM issues WHERE mahalla_id = $1',
    'DELETE FROM event_rsvps WHERE event_id IN (SELECT id FROM events WHERE mahalla_id = $1)',
    'DELETE FROM events WHERE mahalla_id = $1',
    'DELETE FROM announcements WHERE mahalla_id = $1',
    'DELETE FROM memberships WHERE mahalla_id = $1',
  ];
  for (const sql of steps) await q.query(sql, [mahallaId]);
  for (const u of users) {
    await q.query('DELETE FROM device_tokens WHERE user_id = $1', [u]);
    await q.query('DELETE FROM sessions WHERE user_id = $1', [u]);
    await q.query('DELETE FROM users WHERE id = $1', [u]);
  }
  await q.query('DELETE FROM mahalla WHERE id = $1', [mahallaId]);
}

let photoSeed = 0;

async function addPhoto(
  deps: Deps,
  q: Queryable,
  o: { mahallaId: string; ownerId: string; issueId?: string; updateId?: string; eventId?: string; scene: Scene; photo?: DemoPhoto },
) {
  const id = uuidv7();
  photoSeed += 1;
  // Haqiqiy surat (aniq berilgan yoki toifaga mos) bo'lsa — o'sha, aks holda chizma
  const photo = o.photo ?? SCENE_PHOTO[o.scene];
  const { main, thumb } = (photo ? await demoPhoto(photo) : null) ?? (await illustration(o.scene, photoSeed));
  await deps.storage.put(`${id}.jpg`, main, 'image/jpeg');
  await deps.storage.put(`${id}_t.jpg`, thumb, 'image/jpeg');
  await q.query(
    `INSERT INTO media (id, owner_id, mahalla_id, kind, storage_key, thumb_key, mime, size_bytes, width, height, client_upload_id, issue_id, issue_update_id, event_id)
     VALUES ($1, $2, $3, 'IMAGE', $4, $5, 'image/jpeg', $6, 1024, 768, $7, $8, $9, $10)`,
    [id, o.ownerId, o.mahallaId, `${id}.jpg`, `${id}_t.jpg`, main.length, `seed-${id}`, o.issueId ?? null, o.updateId ?? null, o.eventId ?? null],
  );
}

async function seedMahalla(deps: Deps, q: Queryable, d: (typeof DEMOS)[number], now: Date, hashes: { demo: string; temp: string }) {
  const mahallaId = uuidv7();
  await q.query('INSERT INTO mahalla (id, name, slug) VALUES ($1, $2, $3)', [mahallaId, d.name, d.slug]);

  const person = async (login: string, name: string, role: 'RESIDENT' | 'MAHALLA_ADMIN', mustChange = false): Promise<string> => {
    const id = uuidv7();
    await q.query(
      `INSERT INTO users (id, login, display_name, phone, password_hash, must_change_password, temp_password_expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, login, name, '+99890' + String(1000000 + Math.floor(Math.random() * 8999999)), mustChange ? hashes.temp : hashes.demo, mustChange, mustChange ? new Date(now.getTime() + 72 * 3600_000) : null],
    );
    await q.query('INSERT INTO memberships (id, user_id, mahalla_id, role) VALUES ($1, $2, $3, $4)', [uuidv7(), id, mahallaId, role]);
    return id;
  };

  const admin = await person(`admin.${d.key}`, `Admin ${d.name}`, 'MAHALLA_ADMIN');
  const ids: Record<string, string> = {};
  for (const r of RESIDENTS) ids[r.key] = await person(`${r.key}.${d.key}`, r.name, 'RESIDENT', r.mustChange);
  const [ali, vali, sara, dilnoza] = [ids['ali'], ids['vali'], ids['sara'], ids['dilnoza']] as [string, string, string, string];

  // ---- o'tgan 4 oy: yopilgan davrlar (har bir holat uchun g'olib post)
  const periods: Period[] = [];
  let p = periodFor(now);
  for (let k = 0; k < 5; k += 1) {
    periods.push(p);
    p = periodFor(new Date(p.start.getTime() - 1));
  }
  const winners: Array<{ status: IssueStatus; title: string; category: Category }> = [
    { status: 'SELECTED', title: "Maktab oldidagi yo'lga svetofor o'rnatish", category: 'ROAD' },
    { status: 'IN_PROGRESS', title: 'Bolalar maydonchasi qoplamasini yangilash', category: 'LANDSCAPING' },
    { status: 'REFERRED', title: 'Markaziy quvurdagi suv oqishini bartaraf etish', category: 'WATER' },
    { status: 'RESOLVED', title: "Ko'cha chiroqlarini LED ga almashtirish", category: 'LIGHTING' },
  ];
  for (let k = 1; k <= 4; k += 1) {
    const period = periods[k] as Period;
    const w = winners[k - 1] as (typeof winners)[number];
    const created = new Date(period.start.getTime() + 2 * DAY);
    const published = new Date(created.getTime() + DAY);
    const closed = period.end;
    const after = (days: number) => new Date(closed.getTime() + days * DAY);

    const common = { mahallaId, authorId: [ali, vali, sara, dilnoza][k - 1] as string, title: w.title, description: `${w.title}. Aholi tomonidan ko'p marta so'ralgan, tezkor yechim kerak.`, category: w.category, createdAt: created, publishedAt: published };
    const extra: Partial<IssueSeed> =
      w.status === 'IN_PROGRESS' ? { responsible: 'Obodonlashtirish xizmati', nextStep: 'Qoplama materialini yetkazish', dueDate: day(new Date(now.getTime() + 7 * DAY)) }
      : w.status === 'REFERRED' ? { responsible: 'Suv kanal xodimi', nextStep: 'Javobni kutish', dueDate: day(new Date(now.getTime() - 3 * DAY)), referredOrg: 'Suvsoz', referredAt: day(after(2)), followUpAt: day(new Date(now.getTime() - 1 * DAY)) }
      : w.status === 'RESOLVED' ? { responsible: 'Elektr tarmoqlari', nextStep: 'Yakunlandi', dueDate: day(after(10)), resolutionText: "Barcha chiroqlar LED ga almashtirildi, yoritish 2 barobar yaxshilandi" }
      : {};
    const winner = await mkIssue(q, { ...common, status: w.status, ...extra });
    const loser = await mkIssue(q, {
      mahallaId, authorId: vali, title: `Skver o'rindiqlarini ta'mirlash (${period.key})`, description: "O'rindiqlar sinib qolgan, ta'mir kerak.",
      category: 'OTHER', status: 'OPEN', createdAt: created, publishedAt: published,
    });

    const round = await mkRound(q, mahallaId, period, 'CLOSED');
    await mkVotes(q, round, [{ issueId: winner, voters: [ali, vali, sara] }, { issueId: loser, voters: [dilnoza] }], new Date(period.start.getTime() + 10 * DAY));
    await q.query(
      `INSERT INTO round_results (id, round_id, winner_issue_id, snapshot, total_voters, total_votes, closed_at)
       VALUES ($1, $2, $3, $4::jsonb, 4, 4, $5)`,
      [uuidv7(), round, winner, JSON.stringify([{ issueId: winner, title: w.title, votes: 3, rank: 1 }, { issueId: loser, title: `Skver o'rindiqlarini ta'mirlash (${period.key})`, votes: 1, rank: 2 }]), closed],
    );
    await mkUpdate(q, winner, admin, 'PENDING_REVIEW', 'OPEN', null, published);
    await mkUpdate(q, winner, null, 'OPEN', 'SELECTED', "Oy g'olibi", closed);
    if (w.status !== 'SELECTED') await mkUpdate(q, winner, admin, 'SELECTED', 'IN_PROGRESS', null, after(1));
    if (w.status === 'REFERRED') await mkUpdate(q, winner, admin, 'IN_PROGRESS', 'REFERRED', null, after(2));
    if (w.status === 'RESOLVED') {
      const u = await mkUpdate(q, winner, admin, 'IN_PROGRESS', 'RESOLVED', 'Ish yakunlandi', after(10));
      await mkUpdate(q, winner, ali, null, null, 'Rahmat, hammasi yaxshi ishlayapti', after(11), 'AUTHOR_FEEDBACK');
      await addPhoto(deps, q, { mahallaId, ownerId: admin, updateId: u, scene: 'DONE' });
    }
    await addPhoto(deps, q, { mahallaId, ownerId: common.authorId, issueId: winner, scene: w.category });
  }

  // ---- joriy davr
  const cur = periods[0] as Period;
  const roundNow = await mkRound(q, mahallaId, cur, 'OPEN');
  const t = (hoursAgo: number) => new Date(now.getTime() - hoursAgo * 3600_000);

  const lamp = await mkIssue(q, { mahallaId, authorId: ali, title: "Ko'cha chirog'i ishlamayapti", description: "Navoiy ko'chasi 12-uy yonidagi chiroq ikki haftadan beri yonmayapti, kechasi juda qorong'i.", category: 'LIGHTING', status: 'OPEN', createdAt: t(120), publishedAt: t(100) });
  const yard = await mkIssue(q, { mahallaId, authorId: vali, title: "Hovli yo'lagi ta'mirlanmagan", description: "Hovli yo'lagida chuqurlar paydo bo'lgan, yomg'irdan keyin suv to'planadi.", category: 'ROAD', status: 'OPEN', createdAt: t(90), publishedAt: t(80) });
  const waste = await mkIssue(q, { mahallaId, authorId: sara, title: "Chiqindi konteyneri to'lib ketgan", description: "Konteyner haftada bir marta ham bo'shatilmayapti, atrofda hid va iflosliklar.", category: 'WASTE', status: 'OPEN', createdAt: t(60), publishedAt: t(50) });
  await mkVotes(q, roundNow, [
    { issueId: lamp, voters: [ali, vali, sara] },
    { issueId: yard, voters: [ali, vali] },
    { issueId: waste, voters: [vali] },
  ], t(40));
  await mkUpdate(q, lamp, admin, 'PENDING_REVIEW', 'OPEN', null, t(100));
  await addPhoto(deps, q, { mahallaId, ownerId: ali, issueId: lamp, scene: 'LIGHTING', photo: 'street-lamp' });
  await addPhoto(deps, q, { mahallaId, ownerId: vali, issueId: yard, scene: 'ROAD' });
  await addPhoto(deps, q, { mahallaId, ownerId: sara, issueId: waste, scene: 'WASTE' });

  const pending1 = await mkIssue(q, { mahallaId, authorId: dilnoza, title: "Bolalar maydonchasida qum yetishmaydi", description: "Qum qutisi deyarli bo'sh, bolalar o'ynay olmayapti.", category: 'LANDSCAPING', status: 'PENDING_REVIEW', createdAt: t(5) });
  await mkIssue(q, { mahallaId, authorId: ali, title: "Avtobus bekati tomi singan", description: "Yomg'irli kunlarda odamlar ho'l bo'lib turadi, tom qismi qulagan.", category: 'OTHER', status: 'PENDING_REVIEW', createdAt: t(2) });
  const rejected = await mkIssue(q, { mahallaId, authorId: vali, title: "Qo'shni hovlida shovqin", description: "Kechasi shovqin qilishadi, choralar ko'rish kerak.", category: 'OTHER', status: 'REJECTED', createdAt: t(70), rejectedReason: "Bu mahalla infratuzilmasi masalasi emas; ichki ishlar organlariga murojaat qiling" });
  await mkUpdate(q, rejected, admin, 'PENDING_REVIEW', 'REJECTED', "Bu mahalla infratuzilmasi masalasi emas; ichki ishlar organlariga murojaat qiling", t(68));
  await mkIssue(q, { mahallaId, authorId: sara, title: "Navoiy ko'chasidagi chiroq o'chgan (dublikat)", description: "Chiroq yonmayapti, xuddi shu muammo avval yuborilgan.", category: 'LIGHTING', status: 'MERGED', createdAt: t(55), duplicateOfId: lamp });
  await q.query('INSERT INTO issue_follows (issue_id, user_id) VALUES ($1, $2), ($1, $3) ON CONFLICT DO NOTHING', [lamp, sara, dilnoza]);
  void pending1;

  // izohlar
  for (const [who, text, hrs] of [[vali, "Men ham har kuni shu yerdan o'taman, juda qorong'i", 90], [sara, "Qo'llab-quvvatlayman, tezroq hal qilinsin", 70]] as const) {
    await q.query('INSERT INTO comments (id, issue_id, mahalla_id, author_id, text, created_at) VALUES ($1, $2, $3, $4, $5, $6)', [uuidv7(), lamp, mahallaId, who, text, t(hrs)]);
  }
  await q.query('UPDATE issues SET comment_count = 2 WHERE id = $1', [lamp]);

  // ---- haftalik davr (oylik bilan parallel): o'tgan hafta g'olibi 1 hafta ichida hal qilinmoqda + joriy hafta ovozi
  const weekNow = weekPeriodFor(now);
  const weekPrev = weekPeriodFor(new Date(weekNow.start.getTime() - 1));
  const prevWeekly = await mkRound(q, mahallaId, weekPrev, 'CLOSED', 'WEEKLY');
  const weeklyWinTitle = "Kirish yo'lagidagi chuqurni ko'mish";
  const weeklyWin = await mkIssue(q, {
    mahallaId, authorId: sara, title: weeklyWinTitle, description: "Mahalla kirish yo'lagida katta chuqur paydo bo'ldi, mashinalar shikastlanmoqda.",
    category: 'ROAD', status: 'IN_PROGRESS', roundKind: 'WEEKLY', createdAt: new Date(weekPrev.start.getTime() + DAY), publishedAt: new Date(weekPrev.start.getTime() + DAY + 3600_000),
    responsible: "Yo'l xizmati", nextStep: "Shag'al va asfalt keltirish", dueDate: day(new Date(weekPrev.end.getTime() + 7 * DAY)),
  });
  await mkVotes(q, prevWeekly, [{ issueId: weeklyWin, voters: [ali, vali, sara] }], new Date(weekPrev.start.getTime() + 2 * DAY));
  await q.query(
    `INSERT INTO round_results (id, round_id, winner_issue_id, snapshot, total_voters, total_votes, closed_at)
     VALUES ($1, $2, $3, $4::jsonb, 3, 3, $5)`,
    [uuidv7(), prevWeekly, weeklyWin, JSON.stringify([{ issueId: weeklyWin, title: weeklyWinTitle, votes: 3, rank: 1 }]), weekPrev.end],
  );
  await mkUpdate(q, weeklyWin, null, 'OPEN', 'SELECTED', "Hafta g'olibi", weekPrev.end);
  await mkUpdate(q, weeklyWin, admin, 'SELECTED', 'IN_PROGRESS', null, new Date(weekPrev.end.getTime() + 3600_000));

  const weekly = await mkRound(q, mahallaId, weekNow, 'OPEN', 'WEEKLY');
  const wt = (hoursAfterStart: number) => new Date(Math.min(now.getTime() - 3600_000, weekNow.start.getTime() + hoursAfterStart * 3600_000));
  const bench = await mkIssue(q, { mahallaId, authorId: ali, title: "Bekatdagi o'rindiq singan", description: "Avtobus bekatidagi o'rindiq sinib qolgan, keksalar o'tira olmayapti.", category: 'OTHER', status: 'OPEN', roundKind: 'WEEKLY', createdAt: wt(1), publishedAt: wt(2) });
  const hatch = await mkIssue(q, { mahallaId, authorId: vali, title: "Kanalizatsiya qopqog'i ochiq qolgan", description: "Maktab yo'lida qopqoqsiz quduq bor, bolalar uchun xavfli.", category: 'WATER', status: 'OPEN', roundKind: 'WEEKLY', createdAt: wt(2), publishedAt: wt(3) });
  await mkVotes(q, weekly, [{ issueId: hatch, voters: [vali, sara] }, { issueId: bench, voters: [sara] }], wt(4));

  // ---- tadbirlar
  const upcoming = uuidv7();
  const mkEvent = (id: string, title: string, desc: string, startsAt: Date, status: string, extra: { result?: string; rsvp?: number } = {}) =>
    q.query(
      `INSERT INTO events (id, mahalla_id, title, description, starts_at, location, organizer, status, result_text, rsvp_count, created_by_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [id, mahallaId, title, desc, startsAt, 'Markaziy hovli', 'Mahalla qo\'mitasi', status, extra.result ?? null, extra.rsvp ?? 0, admin],
    );
  await mkEvent(upcoming, 'Hashar: hovli va skverni tozalash', "Birgalikda hovli va skverni tozalaymiz, asbob-uskunalar tayyor bo'ladi.", new Date(now.getTime() + 7 * DAY), 'PUBLISHED', { rsvp: 2 });
  await q.query('INSERT INTO event_rsvps (event_id, user_id) VALUES ($1, $2), ($1, $3)', [upcoming, ali, vali]);
  const done = uuidv7();
  await mkEvent(done, 'Navro\'z bayrami tantanasi', "Mahalla aholisi bilan bayram dasturxoni va bolalar o'yinlari.", new Date(now.getTime() - 40 * DAY), 'COMPLETED', { result: "120 dan ortiq kishi qatnashdi, bolalar uchun sovg'alar tarqatildi", rsvp: 3 });
  await addPhoto(deps, q, { mahallaId, ownerId: admin, eventId: done, scene: 'EVENT' });
  await addPhoto(deps, q, { mahallaId, ownerId: admin, eventId: upcoming, scene: 'LANDSCAPING', photo: 'mahalla-street' });
  await mkEvent(uuidv7(), 'Yangi yil oldi yarmarkasi (qoralama)', 'Hali tasdiqlanmagan tadbir loyihasi.', new Date(now.getTime() + 25 * DAY), 'DRAFT');

  // ---- e'lonlar
  const important = uuidv7();
  const mkAnn = (id: string, title: string, body: string, isImportant: boolean, status: 'PUBLISHED' | 'DRAFT', at: Date | null) =>
    q.query(
      `INSERT INTO announcements (id, mahalla_id, title, body, is_important, status, published_at, created_by_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, mahallaId, title, body, isImportant, status, at, admin],
    );
  await mkAnn(important, "Ertaga suv o'chiriladi", "Ertaga soat 09:00 dan 14:00 gacha profilaktika ishlari sababli suv o'chiriladi. Iltimos, oldindan zaxira qiling.", true, 'PUBLISHED', t(20));
  await mkAnn(uuidv7(), "Chiqindi olib ketish jadvali o'zgardi", "Endi chiqindi dushanba, chorshanba va juma kunlari olib ketiladi.", false, 'PUBLISHED', t(100));
  await mkAnn(uuidv7(), "Yig'ilish e'loni (qoralama)", "Mahalla yig'ilishi vaqti keyinroq e'lon qilinadi.", false, 'DRAFT', null);

  // ---- chat
  const chatLines: Array<[string, string]> = [
    [ali, "Assalomu alaykum, qo'shnilar!"], [vali, 'Vaalaykum assalom! Ertaga hashar bor ekan, kelasizlarmi?'],
    [sara, 'Albatta, bolalar bilan kelaman'], [ali, "Men ham keladigan bo'ldim, asbob-uskunalar olib kelaman"],
    [vali, "Chiroq masalasiga ovoz berishni unutmanglar"], [dilnoza, 'Men ovoz berdim, rahmat eslatganingiz uchun!'],
  ];
  const chatIds: string[] = [];
  for (const [i, [who, text]] of chatLines.entries()) {
    const id = uuidv7();
    chatIds.push(id);
    await q.query(
      'INSERT INTO chat_messages (id, mahalla_id, sender_id, text, client_message_id, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
      [id, mahallaId, who, text, `seed-chat-${i}`, new Date(now.getTime() - (chatLines.length - i) * 600_000)],
    );
  }
  // bitta ochiq shikoyat
  await q.query(
    `INSERT INTO reports (id, mahalla_id, reporter_id, target_type, target_id, reason) VALUES ($1, $2, $3, 'CHAT_MESSAGE', $4, $5)`,
    [uuidv7(), mahallaId, sara, chatIds[4] as string, 'Reklama xarakteridagi xabar'],
  );

  // ---- bildirishnoma va audit
  await notify(q, { userIds: [ali], mahallaId, type: 'ISSUE_STATUS_CHANGED', title: 'Muammo tasdiqlandi', body: "«Ko'cha chirog'i ishlamayapti» ovoz berishga qo'yildi", entityType: 'ISSUE', entityId: lamp, dedupeKey: `seed:${lamp}:approve` });
  await notify(q, { userIds: [vali], mahallaId, type: 'ISSUE_REJECTED', title: 'Muammo rad etildi', body: "«Qo'shni hovlida shovqin»: ichki ishlar organlariga murojaat qiling", entityType: 'ISSUE', entityId: rejected, dedupeKey: `seed:${rejected}:reject` });
  await audit(q, { mahallaId, actorId: admin, action: 'issue.approve', targetType: 'ISSUE', targetId: lamp });
  await audit(q, { mahallaId, actorId: admin, action: 'issue.reject', targetType: 'ISSUE', targetId: rejected, reason: 'Mahalla infratuzilmasi masalasi emas' });
  await audit(q, { mahallaId, actorId: admin, action: 'event.publish', targetType: 'EVENT', targetId: upcoming });

  return { mahallaId, important, current: roundNow };
}

/**
 * Demo ma'lumotlar. FAQAT `demo-` slug'li mahallalarni qayta yaratadi; real yozuvlarga tegmaydi.
 * Natija: har bir mahallada 1 admin + 4 aholi, har holatdan post, joriy davrda ovozlar, o'tgan oylar natijasi,
 * tadbirlar, e'lonlar, chat, ochiq shikoyat.
 */
export async function seedDemo(deps: Deps): Promise<void> {
  const now = deps.clock.now();
  const hashes = { demo: await hashPassword(DEMO_PASSWORD), temp: await hashPassword(DEMO_TEMP_PASSWORD) };

  const created: Array<{ slug: string; important: string }> = [];
  for (const d of DEMOS) {
    const existing = await deps.db.query<{ id: string }>('SELECT id FROM mahalla WHERE slug = $1', [d.slug]);
    const result = await deps.db.tx(async (q) => {
      if (existing.rows[0]) await wipeMahalla(deps, q, existing.rows[0].id);
      return seedMahalla(deps, q, d, now, hashes);
    });
    created.push({ slug: d.slug, important: result.important });
  }
  for (const c of created) await fanoutAnnouncement(deps, c.important);

  console.log('\nDemo ma\'lumotlar tayyor.\n');
  console.log('Mahalla           Login                Parol');
  console.log('----------------  -------------------  ------------');
  for (const d of DEMOS) {
    console.log(`${d.slug.padEnd(16)}  ${('admin.' + d.key).padEnd(19)}  ${DEMO_PASSWORD}   (admin)`);
    for (const r of RESIDENTS) {
      const login = `${r.key}.${d.key}`;
      const pass = r.mustChange ? `${DEMO_TEMP_PASSWORD}   (vaqtinchalik: birinchi kirishda almashtiriladi)` : DEMO_PASSWORD;
      console.log(`${d.slug.padEnd(16)}  ${login.padEnd(19)}  ${pass}`);
    }
  }
  console.log('');
}
