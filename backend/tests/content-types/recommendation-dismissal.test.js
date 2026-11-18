const request = require('supertest');
const { setupStrapi, teardownStrapi } = require('../helpers/strapi');
const { createFullAccessToken } = require('../helpers/api-token');
const { expectUniqueViolation } = require('../helpers/unique');
const {
  USER_UID,
  DROPLET_UID,
  RECOMMENDATION_DISMISSAL_UID: UID,
  userData,
  dropletData,
} = require('../helpers/fixtures');

let strapi;
let token;

const api = (method, path) =>
  request(strapi.server.httpServer)
    [method](path)
    .set('Authorization', `Bearer ${token}`);

const makeUser = () => strapi.documents(USER_UID).create({ data: userData() });
const makeDroplet = () =>
  strapi.documents(DROPLET_UID).create({ data: dropletData() });
const dismiss = (user, droplet, extra = {}) =>
  api('post', '/api/recommendation-dismissals').send({
    data: { user: user.documentId, droplet: droplet.documentId, ...extra },
  });
const rowsFor = (key) => strapi.documents(UID).findMany({ filters: { key } });

beforeAll(async () => {
  strapi = await setupStrapi();
  token = await createFullAccessToken(strapi);
});

afterAll(async () => {
  await teardownStrapi();
});

describe('recommendation-dismissal (ODY-954)', () => {
  it('derives the key from the documentIds whatever the caller sends', async () => {
    const [user, droplet] = [await makeUser(), await makeDroplet()];
    const res = await dismiss(user, droplet, { key: 'forged' });

    expect(res.status).toBe(201);
    const row = await strapi
      .documents(UID)
      .findOne({ documentId: res.body.data.documentId });
    expect(row.key).toBe(`${user.documentId}:${droplet.documentId}`);
  });

  it('answers a repeat with the existing row and keeps one row', async () => {
    const [user, droplet] = [await makeUser(), await makeDroplet()];
    const first = await dismiss(user, droplet);
    const more = await Promise.all([
      dismiss(user, droplet),
      dismiss(user, droplet),
    ]);

    expect(more.map((r) => r.status)).toEqual([201, 201]);
    expect(more.map((r) => r.body.data.documentId)).toEqual([
      first.body.data.documentId,
      first.body.data.documentId,
    ]);
    expect(
      await rowsFor(`${user.documentId}:${droplet.documentId}`),
    ).toHaveLength(1);
  });

  it('rejects a second insert of the same key in the database', async () => {
    const key = `uq:${Date.now()}`;
    await strapi.documents(UID).create({ data: { key } });

    await expectUniqueViolation(
      strapi.documents(UID).create({ data: { key } }),
      {
        table: 'recommendation_dismissals',
        column: 'key',
        index: 'recommendation_dismissals_key_uq',
      },
    );
  });

  it.each([
    ['no droplet', (u) => ({ user: u.documentId })],
    ['a numeric user', (_u, d) => ({ user: 5, droplet: d.documentId })],
    [
      'a connect droplet',
      (u, d) => ({ user: u.documentId, droplet: { connect: [d.documentId] } }),
    ],
    [
      'an unknown droplet',
      (u) => ({ user: u.documentId, droplet: 'zzzzzzzzzzzzzzzzzzzzzzzz' }),
    ],
    [
      'an unknown key',
      (u, d) => ({ user: u.documentId, droplet: d.documentId, reason: 'x' }),
    ],
  ])('rejects %s with 400 and writes nothing', async (_label, build) => {
    const [user, droplet] = [await makeUser(), await makeDroplet()];
    const res = await api('post', '/api/recommendation-dismissals').send({
      data: build(user, droplet),
    });

    expect(res.status).toBe(400);
    const read = await api(
      'get',
      `/api/recommendation-dismissals?filters[user][id][$eq]=${user.id}`,
    );
    expect(read.body.data).toHaveLength(0);
  });

  it('lets a student read only their own rows, and nobody without a token', async () => {
    const [a, b] = [await makeUser(), await makeUser()];
    const [da, db] = [await makeDroplet(), await makeDroplet()];
    await dismiss(a, da);
    await dismiss(b, db);

    const url =
      `/api/recommendation-dismissals?filters[user][id][$eq]=${a.id}` +
      '&populate[droplet][fields][0]=id&pagination[pageSize]=1000';
    const res = await api('get', url);
    const anon = await request(strapi.server.httpServer).get(url);

    expect(res.body.data.map((r) => r.droplet.id)).toEqual([da.id]);
    expect(anon.status).toBe(403);
  });

  it.each(['put', 'delete'])('answers %s with 405', async (method) => {
    const [user, droplet] = [await makeUser(), await makeDroplet()];
    const { body } = await dismiss(user, droplet);

    const res = await api(
      method,
      `/api/recommendation-dismissals/${body.data.documentId}`,
    );
    expect(res.status).toBe(405);
  });

  it('is not reachable from droplet or user queries', async () => {
    const [user, droplet] = [await makeUser(), await makeDroplet()];
    await dismiss(user, droplet);

    const droplets = await api(
      'get',
      `/api/droplets?populate=*&filters[id][$eq]=${droplet.id}`,
    );
    const users = await api(
      'get',
      `/api/authorized-users/${user.documentId}?populate=*`,
    );

    expect(droplets.status).toBe(200);
    expect(users.status).toBe(200);
    expect(droplets.body.data).toHaveLength(1);
    expect(users.body.data.documentId).toBe(user.documentId);
    expect(JSON.stringify(droplets.body)).not.toContain('recommendation');
    expect(JSON.stringify(users.body)).not.toContain('recommendation');
  });
});
