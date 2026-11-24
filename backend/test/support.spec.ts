import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { world, type World } from './fixtures';
import { createTestApp, type TestApp } from './helpers';

describe('aholi <-> admin shaxsiy chat', () => {
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
    w = await world(t, 'mahalla-a', 2);
  });

  it('aholi yozadi, admin javob beradi; boshqa aholi suhbatni ko‘rmaydi', async () => {
    const [a, b] = w.residents as [World['residents'][0], World['residents'][0]];
    const sent = await t.req('POST', '/api/v1/support/messages', { token: a.token, json: { text: 'Salom admin', clientMessageId: 'support-msg-001' } });
    expect(sent.status).toBe(201);
    expect(sent.body).toMatchObject({ senderRole: 'RESIDENT', mine: true });

    // idempotent
    const again = await t.req('POST', '/api/v1/support/messages', { token: a.token, json: { text: 'Salom admin', clientMessageId: 'support-msg-001' } });
    expect(again.status).toBe(200);
    expect(again.body.id).toBe(sent.body.id);

    const threads = await t.req('GET', '/api/v1/admin/support/threads', { token: w.admin.token });
    expect(threads.body.items).toHaveLength(1);
    expect(threads.body.items[0]).toMatchObject({ residentId: a.id, awaitingReply: true });

    const reply = await t.req('POST', `/api/v1/admin/support/threads/${a.id}/messages`, {
      token: w.admin.token,
      json: { text: 'Ko‘rib chiqamiz', clientMessageId: 'support-adm-001' },
    });
    expect(reply.status).toBe(201);
    expect(reply.body).toMatchObject({ senderRole: 'MAHALLA_ADMIN', mine: true });

    const mine = await t.req('GET', '/api/v1/support/messages', { token: a.token });
    expect(mine.body.items.map((m: { text: string }) => m.text)).toEqual(['Ko‘rib chiqamiz', 'Salom admin']);
    expect(mine.body.items[0].mine).toBe(false);

    const after = await t.req('GET', `/api/v1/support/messages?after=${sent.body.id}`, { token: a.token });
    expect(after.body.items).toHaveLength(1);

    expect((await t.req('GET', '/api/v1/support/messages', { token: b.token })).body.items).toHaveLength(0);
    expect((await t.req('GET', '/api/v1/support/messages', { token: w.admin.token })).status).toBe(403);
    expect((await t.req('GET', '/api/v1/admin/support/threads', { token: a.token })).status).toBe(403);
  });
});
