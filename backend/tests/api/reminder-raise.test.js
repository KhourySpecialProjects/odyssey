const request = require('supertest');
const { setupStrapi, teardownStrapi } = require('../helpers/strapi');
const { createFullAccessToken } = require('../helpers/api-token');
const {
  ANNOUNCEMENT_UID,
  DROPLET_UID,
  ENROLLMENT_UID,
  USER_UID,
  dropletData,
  enrollmentData,
  userData,
} = require('../helpers/fixtures');

let strapi;
let token;
let user;
let other;
let droplet;

const NOW = '2026-11-12T15:00:00.000Z';
const DAY_START = '2026-11-12T05:00:00.000Z';

const rest = () => request(strapi.server.httpServer);
const auth = () => ({ Authorization: `Bearer ${token}` });
const raise = (data) =>
  rest().post('/api/announcements/raise-reminder').set(auth()).send({ data });
const valid = (overrides = {}) => ({
  userId: user.id,
  dropletId: droplet.id,
  now: NOW,
  dayStart: DAY_START,
  lastRaisedAt: null,
  count: 1,
  content: 'Pick up where you left off.',
  ...overrides,
});
const rows = () =>
  strapi.db.query(ANNOUNCEMENT_UID).findMany({
    where: { type: 'reminder' },
    populate: { authorized_user: true, droplet: true },
  });
const patchRow = async (data) => {
  const [row] = await rows();
  await strapi.db.query(ANNOUNCEMENT_UID).update({ where: { id: row.id }, data });
};

beforeAll(async () => {
  strapi = await setupStrapi();
  token = await createFullAccessToken(strapi);
});

afterAll(async () => {
  await teardownStrapi();
});

beforeEach(async () => {
  await strapi.db.query(ANNOUNCEMENT_UID).deleteMany({ where: {} });
  user = await strapi.documents(USER_UID).create({ data: userData() });
  other = await strapi.documents(USER_UID).create({ data: userData() });
  droplet = await strapi.documents(DROPLET_UID).create({ data: dropletData() });
  await strapi.documents(ENROLLMENT_UID).create({
    data: enrollmentData({
      authorizedUser: user.documentId,
      droplet: droplet.documentId,
    }),
  });
});

describe('POST /announcements/raise-reminder', () => {
  it('creates one reminder row for the learner and droplet', async () => {
    const res = await raise(valid());

    expect(res.status).toBe(200);
    expect(res.body.data.raised).toBe(true);
    const all = await rows();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({
      id: res.body.data.id,
      type: 'reminder',
      reminderCount: 1,
      readAt: null,
      content: 'Pick up where you left off.',
    });
    expect(new Date(all[0].firstCreated).toISOString()).toBe(NOW);
    expect(all[0].authorized_user.id).toBe(user.id);
    expect(all[0].droplet.id).toBe(droplet.id);
  });

  it('answers "today" for the same body again and changes nothing', async () => {
    await raise(valid());
    const again = await raise(valid({ count: 2 }));

    expect(again.status).toBe(200);
    expect(again.body.data).toEqual({ raised: false, reason: 'today' });
    const all = await rows();
    expect(all).toHaveLength(1);
    expect(all[0].reminderCount).toBe(1);
    expect(new Date(all[0].firstCreated).toISOString()).toBe(NOW);
  });

  it('raises once for two requests at the same time', async () => {
    const results = await Promise.all([raise(valid()), raise(valid())]);

    expect(results.map((r) => r.status)).toEqual([200, 200]);
    expect(results.filter((r) => r.body.data.raised)).toHaveLength(1);
    expect(await rows()).toHaveLength(1);
  });

  it('re-raises the same row the next day', async () => {
    await raise(valid());
    await patchRow({ readAt: new Date(NOW) });
    const next = '2026-11-13T15:00:00.000Z';
    const res = await raise(
      valid({
        now: next,
        dayStart: '2026-11-13T05:00:00.000Z',
        lastRaisedAt: NOW,
        count: 2,
      })
    );

    expect(res.body.data.raised).toBe(true);
    const all = await rows();
    expect(all).toHaveLength(1);
    expect(all[0].readAt).toBeNull();
    expect(all[0].reminderCount).toBe(2);
    expect(new Date(all[0].firstCreated).toISOString()).toBe(next);
  });

  it.each([
    ['a wrong lastRaisedAt', '2026-11-01T00:00:00.000Z'],
    ['null when a row exists', null],
  ])('answers "changed" for %s', async (_label, lastRaisedAt) => {
    await raise(valid());
    const res = await raise(
      valid({
        now: '2026-11-13T15:00:00.000Z',
        dayStart: '2026-11-13T05:00:00.000Z',
        lastRaisedAt,
      })
    );

    expect(res.body.data).toEqual({ raised: false, reason: 'changed' });
  });

  it.each([
    ['muted', { reminderMuted: true }],
    ['snoozed past now', { reminderSnoozedUntil: new Date('2026-11-20T00:00:00Z') }],
  ])('answers "declined" for a row that is %s', async (_label, patch) => {
    await raise(valid());
    await patchRow(patch);
    const res = await raise(
      valid({
        now: '2026-11-13T15:00:00.000Z',
        dayStart: '2026-11-13T05:00:00.000Z',
        lastRaisedAt: NOW,
      })
    );

    expect(res.body.data).toEqual({ raised: false, reason: 'declined' });
  });

  it('raises a row whose snooze has ended, clears it, and stores count as sent', async () => {
    await raise(valid({ count: 2 }));
    await patchRow({ reminderSnoozedUntil: new Date('2026-11-13T00:00:00Z') });
    const res = await raise(
      valid({
        now: '2026-11-14T15:00:00.000Z',
        dayStart: '2026-11-14T05:00:00.000Z',
        lastRaisedAt: NOW,
        count: 2,
      })
    );

    expect(res.body.data.raised).toBe(true);
    const [row] = await rows();
    expect(row.reminderSnoozedUntil).toBeNull();
    expect(row.reminderCount).toBe(2);
  });

  it('answers 409 when the learner is not enrolled', async () => {
    const res = await raise(valid({ userId: other.id }));

    expect(res.status).toBe(409);
    expect(res.body.error.message).toBe('Not enrolled in this droplet');
  });

  it('answers 404 for an unknown user', async () => {
    const res = await raise(valid({ userId: 2000000000 }));

    expect(res.status).toBe(404);
  });

  it('is not blocked by another learner raising the same day', async () => {
    await strapi.documents(ENROLLMENT_UID).create({
      data: enrollmentData({
        authorizedUser: other.documentId,
        droplet: droplet.documentId,
      }),
    });
    await raise(valid({ userId: other.id }));
    const res = await raise(valid());

    expect(res.body.data.raised).toBe(true);
    expect(await rows()).toHaveLength(2);
  });

  it.each([
    ['an extra key', { extra: 1 }],
    ['a bad id', { userId: 0 }],
    ['a bad date', { now: 'tomorrow' }],
    ['a bad dayStart', { dayStart: 5 }],
    ['a lastRaisedAt without a T', { lastRaisedAt: '2026-11-12' }],
    ['count above 100', { count: 101 }],
    ['a negative count', { count: -1 }],
    ['empty content', { content: '' }],
    ['untrimmed content', { content: ' hi ' }],
  ])('answers 400 for %s', async (_label, overrides) => {
    const res = await raise(valid(overrides));

    expect(res.status).toBe(400);
    expect(await rows()).toHaveLength(0);
  });

  it('answers 400 for a missing required key', async () => {
    const { content, ...incomplete } = valid();
    const res = await raise(incomplete);

    expect(res.status).toBe(400);
    expect(await rows()).toHaveLength(0);
  });

  it('answers 400 for an extra top-level key', async () => {
    const res = await rest()
      .post('/api/announcements/raise-reminder')
      .set(auth())
      .send({ data: valid(), extra: 1 });

    expect(res.status).toBe(400);
    expect(await rows()).toHaveLength(0);
  });

  it('answers "today" when another droplet was raised today', async () => {
    const second = await strapi
      .documents(DROPLET_UID)
      .create({ data: dropletData() });
    await strapi.documents(ENROLLMENT_UID).create({
      data: enrollmentData({
        authorizedUser: user.documentId,
        droplet: second.documentId,
      }),
    });
    await raise(valid({ dropletId: second.id }));
    const res = await raise(valid());

    expect(res.body.data).toEqual({ raised: false, reason: 'today' });
  });

  it.each([
    ['muted', { reminderMuted: true }],
    ['snoozed', { reminderSnoozedUntil: new Date('2026-11-20T00:00:00Z') }],
  ])('keeps a %s row as the learner left it', async (_label, patch) => {
    await raise(valid());
    await patchRow(patch);
    const before = (await rows())[0];
    const res = await raise(
      valid({
        now: '2026-11-13T15:00:00.000Z',
        dayStart: '2026-11-13T05:00:00.000Z',
        lastRaisedAt: NOW,
        count: 2,
      })
    );

    expect(res.body.data).toEqual({ raised: false, reason: 'declined' });
    const [after] = await rows();
    expect(after.reminderMuted).toBe(before.reminderMuted);
    expect(after.reminderSnoozedUntil).toEqual(before.reminderSnoozedUntil);
    expect(after.reminderCount).toBe(1);
  });

  it('accepts count 0', async () => {
    const res = await raise(valid({ count: 0 }));

    expect(res.body.data.raised).toBe(true);
    expect((await rows())[0].reminderCount).toBe(0);
  });
});
