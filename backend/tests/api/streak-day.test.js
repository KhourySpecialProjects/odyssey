const request = require('supertest');
const { setupStrapi, teardownStrapi } = require('../helpers/strapi');
const { createFullAccessToken } = require('../helpers/api-token');
const { expectUniqueViolation } = require('../helpers/unique');
const { STREAK_DAY_UID, USER_UID, userData } = require('../helpers/fixtures');

let strapi;
let token;
let user;
let other;

const rest = () => request(strapi.server.httpServer);
const auth = () => ({ Authorization: `Bearer ${token}` });
const record = (data) =>
  rest().post('/api/streak-days/record').set(auth()).send({ data });
const revive = (data) =>
  rest().post('/api/streak-days/revive').set(auth()).send({ data });
const valid = (overrides = {}) => ({
  userId: user.id,
  date: '2026-11-10',
  lessonId: 3,
  ...overrides,
});
const rows = () =>
  strapi.db.query(STREAK_DAY_UID).findMany({
    populate: { user: true },
    orderBy: { date: 'asc' },
  });

beforeAll(async () => {
  strapi = await setupStrapi();
  token = await createFullAccessToken(strapi);
});

afterAll(async () => {
  await teardownStrapi();
});

beforeEach(async () => {
  await strapi.db.connection('streak_days').del();
  user = await strapi.documents(USER_UID).create({ data: userData() });
  other = await strapi.documents(USER_UID).create({ data: userData() });
});

describe('POST /streak-days/record', () => {
  it("creates the learner's day with its first lesson", async () => {
    const res = await record(valid());

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      date: '2026-11-10',
      lessons: 1,
      added: true,
    });
    const [row] = await rows();
    expect(row).toMatchObject({
      key: `${user.id}:2026-11-10`,
      date: '2026-11-10',
      lessonIds: [3],
    });
    expect(row.user.id).toBe(user.id);
  });

  it('adds a second lesson to the same day, and ignores a repeat', async () => {
    await record(valid());
    const second = await record(valid({ lessonId: 4 }));
    const repeat = await record(valid({ lessonId: 4 }));

    expect(second.body.data).toEqual({
      date: '2026-11-10',
      lessons: 2,
      added: true,
    });
    expect(repeat.body.data).toEqual({
      date: '2026-11-10',
      lessons: 2,
      added: false,
    });
    expect((await rows()).map((r) => r.lessonIds)).toEqual([[3, 4]]);
  });

  it('keeps each day and each learner on its own row', async () => {
    await record(valid());
    await record(valid({ date: '2026-11-11' }));
    await record(valid({ userId: other.id }));

    expect((await rows()).map((r) => r.key).sort()).toEqual(
      [
        `${user.id}:2026-11-10`,
        `${user.id}:2026-11-11`,
        `${other.id}:2026-11-10`,
      ].sort()
    );
  });

  it('leaves one row when two lessons are recorded at once', async () => {
    const results = await Promise.all([
      record(valid({ lessonId: 5 })),
      record(valid({ lessonId: 6 })),
    ]);

    expect(results.map((r) => r.status)).toEqual([200, 200]);
    const all = await rows();
    expect(all).toHaveLength(1);
    expect([...all[0].lessonIds].sort()).toEqual([5, 6]);
  });

  it.each([
    ['a body without data', { userId: 1 }, 'Body must be'],
    ['an unknown outer key', { data: {}, extra: 1 }, 'Invalid key extra'],
  ])('refuses %s', async (_, body, message) => {
    const res = await rest()
      .post('/api/streak-days/record')
      .set(auth())
      .send(body);

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain(message);
  });

  it.each([
    ['an unknown key', { extra: 1 }, 'Invalid key extra'],
    [
      'a missing userId',
      { userId: undefined },
      'userId must be a positive integer',
    ],
    [
      'a string lessonId',
      { lessonId: '3' },
      'lessonId must be a positive integer',
    ],
    [
      'a day that does not exist',
      { date: '2026-02-30' },
      'date must be a calendar date',
    ],
    [
      'a date with a time',
      { date: '2026-11-10T00:00:00Z' },
      'date must be a calendar date',
    ],
  ])('refuses %s', async (_, overrides, message) => {
    const res = await record(valid(overrides));

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain(message);
    expect(await rows()).toHaveLength(0);
  });

  it('is a 404 for a learner who does not exist', async () => {
    const res = await record(valid({ userId: 2147483000 }));

    expect(res.status).toBe(404);
    expect(await rows()).toHaveLength(0);
  });

  it('needs the service token', async () => {
    const res = await rest()
      .post('/api/streak-days/record')
      .send({ data: valid() });

    expect([401, 403]).toContain(res.status);
    expect(await rows()).toHaveLength(0);
  });
});

describe('POST /streak-days/revive', () => {
  // A streak through 8 Nov that missed 9 Nov
  beforeEach(async () => {
    await record(valid({ date: '2026-11-07' }));
    await record(valid({ date: '2026-11-08' }));
  });
  const yesterday = (overrides = {}) => ({
    userId: user.id,
    date: '2026-11-09',
    ...overrides,
  });

  it('revives a missed day after a day that counts, spending one revive', async () => {
    const res = await revive(yesterday());

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      date: '2026-11-09',
      revivesLeft: 1,
      added: true,
    });
    const day = (await rows()).find((r) => r.date === '2026-11-09');
    expect(day).toMatchObject({ revived: true, lessonIds: [] });
  });

  it('spends nothing more on a repeat for the same day', async () => {
    await revive(yesterday());
    const again = await revive(yesterday());

    expect(again.body.data).toEqual({
      date: '2026-11-09',
      revivesLeft: 1,
      added: false,
    });
    expect((await rows()).filter((r) => r.revived)).toHaveLength(1);
  });

  it('spends one revive for two clicks at once', async () => {
    const results = await Promise.all([
      revive(yesterday()),
      revive(yesterday()),
    ]);

    expect(results.map((r) => r.status)).toEqual([200, 200]);
    expect((await rows()).filter((r) => r.revived)).toHaveLength(1);
  });

  it('refuses a third revive once both are spent', async () => {
    await revive(yesterday());
    await record(valid({ date: '2026-11-10' }));
    await revive(yesterday({ date: '2026-11-11' }));
    await record(valid({ date: '2026-11-12' }));

    const res = await revive(yesterday({ date: '2026-11-13' }));

    expect(res.status).toBe(409);
    expect(res.body.error.message).toBe('No revives left');
    expect((await rows()).filter((r) => r.revived)).toHaveLength(2);
  });

  it.each([
    [
      'a day that already counts',
      { date: '2026-11-08' },
      'That day already counts',
    ],
    [
      'a second missed day in a row',
      { date: '2026-11-10' },
      "There's no streak to revive",
    ],
  ])('refuses %s', async (_, overrides, message) => {
    const res = await revive(yesterday(overrides));

    expect(res.status).toBe(409);
    expect(res.body.error.message).toBe(message);
    expect((await rows()).filter((r) => r.revived)).toHaveLength(0);
  });

  it("counts only the learner's own revives", async () => {
    await record(valid({ userId: other.id, date: '2026-11-08' }));
    await revive(yesterday({ userId: other.id }));

    const res = await revive(yesterday());

    expect(res.body.data.revivesLeft).toBe(1);
  });

  it.each([
    ['an unknown key', { lessonId: 3 }, 'Invalid key lessonId'],
    ['a bad date', { date: '2026-13-01' }, 'date must be a calendar date'],
  ])('refuses %s', async (_, overrides, message) => {
    const res = await revive(yesterday(overrides));

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain(message);
  });

  it('is a 404 for a learner who does not exist', async () => {
    const res = await revive(yesterday({ userId: 2147483000 }));

    expect(res.status).toBe(404);
  });
});

describe('streak_days', () => {
  it('rejects a duplicate key at the database level (unique index)', async () => {
    const key = '9001:2026-11-10';
    await expectUniqueViolation(
      strapi.db.transaction(async () => {
        const q = strapi.db.query(STREAK_DAY_UID);
        await q.create({
          data: {
            documentId: 'sdupa',
            key,
            date: '2026-11-10',
            lessonIds: [1],
          },
        });
        await q.create({
          data: {
            documentId: 'sdupb',
            key,
            date: '2026-11-10',
            lessonIds: [2],
          },
        });
      }),
      { table: 'streak_days', column: 'key', index: 'streak_days_key_uq' }
    );
  });
});

describe('REST', () => {
  it('lists days with the service token', async () => {
    await record(valid());

    const res = await rest()
      .get('/api/streak-days')
      .query({
        filters: { user: { id: { $eq: user.id } } },
        fields: ['date', 'lessonIds'],
      })
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({
      date: '2026-11-10',
      lessonIds: [3],
    });
  });

  it('does not route a core create on /streak-days', async () => {
    const res = await rest()
      .post('/api/streak-days')
      .set(auth())
      .send({
        data: { key: '1:2026-11-10', date: '2026-11-10', lessonIds: [1] },
      });

    expect([404, 405]).toContain(res.status);
    expect(await rows()).toHaveLength(0);
  });
});
