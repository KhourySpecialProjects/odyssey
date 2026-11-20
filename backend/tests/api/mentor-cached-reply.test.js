const request = require('supertest');
const { setupStrapi, teardownStrapi } = require('../helpers/strapi');
const { createFullAccessToken } = require('../helpers/api-token');
const { expectUniqueViolation } = require('../helpers/unique');
const { MENTOR_CACHED_REPLY_UID, cachedReplyData } = require('../helpers/fixtures');

let strapi;
let token;

const api = (method, path) =>
  request(strapi.server.httpServer)[method](path).set('Authorization', `Bearer ${token}`);
const count = (filters) => strapi.documents(MENTOR_CACHED_REPLY_UID).count({ filters });

beforeAll(async () => {
  strapi = await setupStrapi();
  token = await createFullAccessToken(strapi);
});

afterAll(async () => {
  await teardownStrapi();
});

describe('mentor-cached-reply schema (ODY-967)', () => {
  it('has exactly the agreed attributes', () => {
    const type = strapi.contentType(MENTOR_CACHED_REPLY_UID);
    const own = Object.keys(type.attributes).filter(
      (name) => !['createdAt', 'updatedAt', 'publishedAt', 'createdBy', 'updatedBy', 'locale', 'localizations'].includes(name),
    );

    expect(own.sort()).toEqual(['dropletId', 'key', 'lessonId', 'model', 'promptVersion', 'scope', 'slot', 'text']);
    expect(type.options.draftAndPublish).toBe(false);
  });

  it('rejects a duplicate key at the database level (unique index)', async () => {
    const data = cachedReplyData();

    await expectUniqueViolation(
      strapi.db.transaction(async () => {
        const q = strapi.db.query(MENTOR_CACHED_REPLY_UID);
        await q.create({ data: { documentId: 'crdupa', ...data } });
        await q.create({ data: { documentId: 'crdupb', ...data } });
      }),
      { table: 'mentor_cached_replies', column: 'key', index: 'mentor_cached_replies_key_uq' },
    );
  });
});

describe('mentor-cached-reply routes (ODY-967)', () => {
  it('finds nothing, stores a lesson row, then finds it', async () => {
    const row = cachedReplyData({ text: 'Saved summary' });

    const miss = await api('post', '/api/mentor-cached-replies/find').send({ key: row.key });
    const first = await api('post', '/api/mentor-cached-replies/store').send(row);
    const second = await api('post', '/api/mentor-cached-replies/store').send({ ...row, text: 'other' });
    const hit = await api('post', '/api/mentor-cached-replies/find').send({ key: row.key });

    expect(miss.status).toBe(200);
    expect(miss.body).toEqual({ data: { text: null } });
    expect(first.body.data).toMatchObject({ stored: true });
    expect(second.body.data).toMatchObject({ stored: false, id: first.body.data.id });
    expect(hit.body).toEqual({ data: { text: 'Saved summary' } });
  });

  it('stores a hint row whose ids can be 0 or past the row-id limit', async () => {
    const key = `hint:1:0:2147483648:${'f'.repeat(64)}`;

    const res = await api('post', '/api/mentor-cached-replies/store').send(
      cachedReplyData({ scope: 'hint', slot: 'hint:1:0:2147483648', key }),
    );

    expect(res.body.data).toMatchObject({ stored: true });
  });

  const hash = 'a'.repeat(64);
  const BAD = [
    ['an extra key', { extra: 1 }],
    ['uppercase hex', { key: `lesson:1:${'A'.repeat(64)}` }],
    ['a 63-character hash', { key: `lesson:1:${'a'.repeat(63)}` }],
    ['an unknown scope', { scope: 'droplet' }],
    ['a slot for another lesson', { slot: 'lesson:2', key: `lesson:2:${hash}` }],
    ['a hint slot with two ids', { scope: 'hint', slot: 'hint:1:7', key: `hint:1:7:${hash}` }],
    ['a key whose slot differs from slot', { key: `lesson:2:${hash}` }],
    ['a leading zero in the slot', { slot: 'lesson:01', key: `lesson:01:${hash}` }],
    ['a leading zero in a hint id', { scope: 'hint', slot: 'hint:1:07:3', key: `hint:1:07:3:${hash}` }],
    ['dropletId 0', { dropletId: 0 }],
    ['an empty text', { text: '' }],
    ['a 20001-character text', { text: 'x'.repeat(20001) }],
    ['a 41-character promptVersion', { promptVersion: 'v'.repeat(41) }],
    ['a 101-character model', { model: 'm'.repeat(101) }],
  ];

  it.each(BAD)('refuses a store with %s and writes no row', async (_name, override) => {
    const row = { ...cachedReplyData(), ...override };
    const before = await count({});

    const res = await api('post', '/api/mentor-cached-replies/store').send(row);

    expect(res.status).toBe(400);
    expect(await count({})).toBe(before);
  });

  it.each([
    ['no key', {}],
    ['an extra key', { key: `lesson:1:${hash}`, extra: 1 }],
    ['a malformed key', { key: 'lesson:1:abc' }],
    ['a leading zero', { key: `lesson:01:${hash}` }],
  ])('refuses a find with %s', async (_name, body) => {
    const res = await api('post', '/api/mentor-cached-replies/find').send(body);

    expect(res.status).toBe(400);
  });

  it.each([
    ['get', '/api/mentor-cached-replies'],
    ['get', '/api/mentor-cached-replies/abcdefgh12'],
    ['post', '/api/mentor-cached-replies'],
  ])('has no core route: %s %s', async (method, path) => {
    const res = await api(method, path).send({});

    expect([404, 405]).toContain(res.status);
  });

  const ROUTES = ['/api/mentor-cached-replies/find', '/api/mentor-cached-replies/store'];

  it.each(ROUTES)('%s is not reachable without a token', async (path) => {
    const res = await request(strapi.server.httpServer).post(path).send({});

    expect([401, 403]).toContain(res.status);
  });

  it('refuses a registered user JWT even when the role is granted the actions', async () => {
    const roleService = strapi.plugin('users-permissions').service('role');
    const { id } = await strapi.db.query('plugin::users-permissions.role').findOne({ where: { type: 'authenticated' } });
    const role = await roleService.findOne(id);
    const [apiName, controller] = ['api::mentor-cached-reply', 'custom-mentor-cached-reply'];
    await roleService.updateRole(id, {
      permissions: {
        ...role.permissions,
        [apiName]: { controllers: { [controller]: { find: { enabled: true }, store: { enabled: true } } } },
      },
    });
    const registered = await request(strapi.server.httpServer)
      .post('/api/auth/local/register')
      .send({ username: `u${Date.now()}`, email: `u${Date.now()}@example.test`, password: 'Passw0rd!long' });
    expect(registered.body.jwt).toBeTruthy();

    for (const path of ROUTES) {
      const res = await request(strapi.server.httpServer)
        .post(path)
        .set('Authorization', `Bearer ${registered.body.jwt}`)
        .send({});
      expect(res.status).toBe(403);
    }
  });

  it('answers the API token with a 200', async () => {
    const res = await api('post', '/api/mentor-cached-replies/find').send({ key: `lesson:1:${hash}` });

    expect(res.status).toBe(200);
  });
});
