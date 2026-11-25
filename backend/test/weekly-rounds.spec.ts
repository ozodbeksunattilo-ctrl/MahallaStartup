import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { weekPeriodFor } from '../src/modules/rounds/period';
import { closeDueRounds, currentRound } from '../src/modules/rounds/service';
import { key, openIssue, world, type World } from './fixtures';
import { createTestApp, type Actor, type TestApp } from './helpers';

describe('haftalik ovoz davri (oylik bilan parallel)', () => {
  let t: TestApp;
  let w: World;

  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(async () => {
    await t.close();
  });
  beforeEach(async () => {
    await t.reset();
    w = await world(t, 'mahalla-w', 3);
  });

  const vote = (who: { token: string }, issueId: string) => t.req('PUT', `/api/v1/issues/${issueId}/vote`, { token: who.token });

  /** Haftalik muammo: aholi WEEKLY bilan yuboradi, admin tasdiqlaydi. */
  async function openWeekly(who: Actor, title: string): Promise<string> {
    const created = await t.req('POST', '/api/v1/issues', {
      token: who.token,
      headers: { 'Idempotency-Key': key() },
      json: { title, description: "Tez hal qilinishi kerak bo'lgan muammo", category: 'ROAD', locationText: "Navoiy ko'chasi 1", roundKind: 'WEEKLY' },
    });
    expect(created.status).toBe(201);
    expect(created.body.roundKind).toBe('WEEKLY');
    const approved = await t.req('POST', `/api/v1/admin/issues/${created.body.id}/approve`, { token: w.admin.token });
    expect(approved.status).toBe(200);
    return created.body.id as string;
  }

  it('hafta dushanba 00:00 dan (Toshkent) boshlanadi va 7 kun davom etadi', () => {
    // 2026-11-24 seshanba 10:00 Toshkent -> hafta 23-noyabr dushanba
    const p = weekPeriodFor(new Date('2026-11-24T10:00:00+05:00'));
    expect(p.start.toISOString()).toBe('2026-11-22T19:00:00.000Z');
    expect(p.end.toISOString()).toBe('2026-11-29T19:00:00.000Z');
    expect(p.key).toBe('W-2026-11-23');
    // Yakshanba 23:59 hali shu hafta, dushanba 00:00 — keyingisi
    expect(weekPeriodFor(new Date('2026-11-29T23:59:00+05:00')).key).toBe('W-2026-11-23');
    expect(weekPeriodFor(new Date('2026-11-30T00:00:00+05:00')).key).toBe('W-2026-11-30');
  });

  it('oylik va haftalik limitlar alohida: 3 + 3 ovoz; /rounds/current ikkalasini qaytaradi', async () => {
    const me = w.residents[0]!;
    const monthly = await Promise.all([0, 1, 2].map((i) => openIssue(t, w, w.residents[i]!, `Oylik ${i}`)));
    const weekly = await Promise.all([0, 1, 2, 3].map((i) => openWeekly(w.residents[i % 3]!, `Haftalik ${i}`)));

    for (const id of monthly) expect((await vote(me, id)).status).toBe(200);
    for (const id of weekly.slice(0, 3)) {
      const r = await vote(me, id);
      expect(r.status).toBe(200);
      expect(r.body.roundKind).toBe('WEEKLY');
    }
    const fourth = await vote(me, weekly[3]!);
    expect(fourth.status).toBe(409);
    expect(fourth.body.error.message).toBe('Bu hafta uchun 3 ta ovozingizdan foydalandingiz');

    const current = await t.req('GET', '/api/v1/rounds/current', { token: me.token });
    expect(current.body.round.kind).toBe('MONTHLY');
    expect(current.body.votesLeft).toBe(0);
    expect(current.body.weekly.round.kind).toBe('WEEKLY');
    expect(current.body.weekly.votesLeft).toBe(0);
    expect(current.body.weekly.myVotes.map((v: { issueId: string }) => v.issueId).sort()).toEqual(weekly.slice(0, 3).sort());

    // Lenta: har bir muammo o'z davri bo'yicha myVote/voteCount; roundKind filtri
    const feed = await t.req('GET', '/api/v1/issues?roundKind=WEEKLY&limit=50', { token: me.token });
    expect(feed.body.items).toHaveLength(4);
    const voted = feed.body.items.filter((i: { myVote: boolean }) => i.myVote).map((i: { id: string }) => i.id);
    expect(voted.sort()).toEqual(weekly.slice(0, 3).sort());
    expect(feed.body.items.every((i: { roundKind: string; voteCount: number | null }) => i.roundKind === 'WEEKLY' && i.voteCount !== null)).toBe(true);

    const home = await t.req('GET', '/api/v1/home', { token: me.token });
    expect(home.body.round.votesLeft).toBe(0);
    expect(home.body.weeklyRound.votesLeft).toBe(0);
  });

  it("hafta tugaganda g'olib SELECTED bo'ladi va 1 haftalik muddat qo'yiladi; oylik davr ochiq qoladi", async () => {
    const win = await openWeekly(w.residents[0]!, 'Chuqurni komish');
    const lose = await openWeekly(w.residents[1]!, 'Orindiqni tuzatish');
    for (const r of w.residents) expect((await vote(r, win)).status).toBe(200);
    expect((await vote(w.residents[0]!, lose)).status).toBe(200);

    // Keyingi dushanba 00:00 (Toshkent): haftalik davr yopiladi, noyabr oylik davri (1-dekabrgacha) ochiq qoladi
    expect(await closeDueRounds(t.deps, new Date('2026-11-30T00:00:00+05:00'))).toBe(1);
    const month = await currentRound(t.db, w.mahallaId, t.clock.now(), 'MONTHLY');
    expect(month.status).toBe('OPEN');

    const detail = await t.req('GET', `/api/v1/issues/${win}`, { token: w.residents[2]!.token });
    expect(detail.body.status).toBe('SELECTED');
    expect(detail.body.dueDate).toBe('2026-12-07');
    expect(detail.body.history.at(-1).reason).toBe("Hafta g'olibi");

    const rounds = await t.req('GET', '/api/v1/rounds?kind=WEEKLY', { token: w.residents[0]!.token });
    expect(rounds.body.items[0].kind).toBe('WEEKLY');
    expect(rounds.body.items[0].winner.issueId).toBe(win);

    const notes = await t.db.query<{ title: string }>("SELECT title FROM notifications WHERE type = 'ROUND_WINNER' AND user_id = $1", [w.residents[0]!.id]);
    expect(notes.rows.map((n) => n.title)).toContain("Muammongiz hafta g'olibi bo'ldi!");
  });

  it('oylik muammo standart; haftalik muammo oylik davrga tushmaydi', async () => {
    const m = await openIssue(t, w, w.residents[0]!, 'Oddiy muammo');
    const wk = await openWeekly(w.residents[1]!, 'Tezkor muammo');
    const monthRound = await currentRound(t.db, w.mahallaId, t.clock.now(), 'MONTHLY');
    const weekRound = await currentRound(t.db, w.mahallaId, t.clock.now(), 'WEEKLY');
    const entries = await t.db.query<{ round_id: string; issue_id: string }>('SELECT round_id, issue_id FROM round_entries');
    expect(entries.rows).toEqual(
      expect.arrayContaining([
        { round_id: monthRound.id, issue_id: m },
        { round_id: weekRound.id, issue_id: wk },
      ]),
    );
    expect(entries.rows).toHaveLength(2);
  });
});
