const request = require('supertest');
const { setupStrapi, teardownStrapi } = require('../helpers/strapi');
const { createFullAccessToken } = require('../helpers/api-token');
const {
  DROPLET_UID,
  ENROLLMENT_UID,
  USER_UID,
  dropletData,
  enrollmentData,
  userData,
} = require('../helpers/fixtures');

let strapi;
let token;
let coCompletionPairs;
let MIN_PAIR_COUNT;

const get = (headers = {}) =>
  request(strapi.server.httpServer).get('/api/co-completions').set(headers);
const pairs = async () => (await get({ Authorization: `Bearer ${token}` })).body.data.pairs;

const makeDroplets = (n) =>
  Promise.all(
    Array.from({ length: n }, () => strapi.documents(DROPLET_UID).create({ data: dropletData() }))
  );
const makeUsers = (n) =>
  Promise.all(
    Array.from({ length: n }, () => strapi.documents(USER_UID).create({ data: userData() }))
  );
const enroll = (user, droplet, overrides = {}) =>
  strapi.documents(ENROLLMENT_UID).create({
    data: enrollmentData({
      authorizedUser: user.documentId,
      droplet: droplet.documentId,
      isComplete: true,
      ...overrides,
    }),
  });
// Every student finishes every droplet.
const seed = async (students, droplets) => {
  const users = await makeUsers(students);
  for (const u of users) for (const d of droplets) await enroll(u, d);
  return users;
};

beforeAll(async () => {
  strapi = await setupStrapi();
  token = await createFullAccessToken(strapi);
  ({ coCompletionPairs, MIN_PAIR_COUNT } = require('../../dist/src/lib/co-completion'));
});

afterAll(async () => {
  await teardownStrapi();
});

beforeEach(async () => {
  await strapi.db.connection('enrollments').del();
});

describe('GET /co-completions', () => {
  it('counts distinct students per pair, both directions, with no user data', async () => {
    const [a, b] = await makeDroplets(2);
    await seed(3, [a, b]);

    const res = await get({ Authorization: `Bearer ${token}` });

    expect(res.status).toBe(200);
    expect(Object.keys(res.body)).toEqual(['data']);
    expect(Object.keys(res.body.data)).toEqual(['pairs']);
    expect(res.body.data.pairs).toHaveLength(2);
    expect(res.body.data.pairs).toEqual(
      expect.arrayContaining([
        { source: a.id, target: b.id, count: 3 },
        { source: b.id, target: a.id, count: 3 },
      ])
    );
  });

  it.each([
    ['one short of the threshold', -1, 0],
    ['at the threshold', 0, 2],
  ])('%s returns %i pairs', async (_name, offset, expected) => {
    await seed(MIN_PAIR_COUNT + offset, await makeDroplets(2));

    expect(await pairs()).toHaveLength(expected);
  });

  it.each([
    ['an in-progress enrollment', { isComplete: false }, false],
    ['an archived finished enrollment', { isArchived: true }, true],
  ])('%s: counted is %s', async (_name, overrides, counted) => {
    const [a, b] = await makeDroplets(2);
    await seed(2, [a, b]);
    const [u] = await makeUsers(1);
    await enroll(u, a);
    await enroll(u, b, overrides);

    expect((await pairs()).length > 0).toBe(counted);
  });

  it('counts a student with two finished enrollments for a droplet once', async () => {
    const [a, b] = await makeDroplets(2);
    const users = await seed(2, [a, b]);
    await enroll(users[0], a);

    expect(await pairs()).toHaveLength(0);
  });

  it('ignores the query string, so it cannot lower the threshold', async () => {
    await seed(2, await makeDroplets(2));

    const res = await request(strapi.server.httpServer)
      .get('/api/co-completions?minCount=1')
      .set({ Authorization: `Bearer ${token}` });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: { pairs: [] } });
  });

  it('refuses a request without a token', async () => {
    const res = await get();
    expect([401, 403]).toContain(res.status);
  });

  it('stays token-only even if the Public role is granted the action', async () => {
    const permissions = strapi.documents('plugin::users-permissions.permission');
    const role = await strapi
      .documents('plugin::users-permissions.role')
      .findFirst({ filters: { type: 'public' } });
    const grant = await permissions.create({
      data: { action: 'api::enrollment.custom-enrollment.coCompletion', role: role.documentId },
    });
    try {
      expect((await get()).status).toBe(401);
    } finally {
      await permissions.delete({ documentId: grant.documentId });
    }
  });
});

describe('coCompletionPairs', () => {
  it('keeps the top targets per source, lowest id on a tie', async () => {
    const [s, t1, t2, t3] = await makeDroplets(4);
    const users = await makeUsers(3);
    for (const u of users) await enroll(u, s);
    for (const u of users) await enroll(u, t1);
    for (const u of users.slice(0, 2)) await enroll(u, t2);
    for (const u of users.slice(0, 2)) await enroll(u, t3);

    const result = await coCompletionPairs({ minCount: 1, perSource: 2 });
    const targetsOf = (id) =>
      result.filter((p) => p.source === id).map((p) => [p.target, p.count]);

    for (const id of new Set(result.map((p) => p.source))) {
      expect(targetsOf(id).length).toBeLessThanOrEqual(2);
    }
    expect(targetsOf(s.id)).toEqual([
      [t1.id, 3],
      [Math.min(t2.id, t3.id), 2],
    ]);
    // t1 pairs with s (3) and with t2 and t3 (2 each): the lower id of those two wins.
    expect(targetsOf(t1.id)).toEqual([
      [s.id, 3],
      [Math.min(t2.id, t3.id), 2],
    ]);
  });
});
