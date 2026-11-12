const request = require('supertest');
const { setupStrapi, teardownStrapi } = require('../helpers/strapi');
const { createFullAccessToken } = require('../helpers/api-token');
const {
  DROPLET_UID,
  LESSON_UID,
  dropletData,
  lessonData,
} = require('../helpers/fixtures');

let strapi;
let token;

beforeAll(async () => {
  strapi = await setupStrapi();
  token = await createFullAccessToken(strapi);
});

afterAll(async () => {
  await teardownStrapi();
});

const deepDelete = (ref, body) =>
  request(strapi.server.httpServer)
    .post(`/api/droplets/${ref}/deep-delete`)
    .set({ Authorization: `Bearer ${token}` })
    .send(body);

/** A droplet with two lessons. */
async function setup(overrides = {}) {
  const lessons = [];
  for (let i = 0; i < 2; i++) {
    lessons.push(await strapi.documents(LESSON_UID).create({ data: lessonData() }));
  }
  const droplet = await strapi.documents(DROPLET_UID).create({
    data: dropletData({ lessons: lessons.map((l) => l.documentId), ...overrides }),
  });
  return { droplet, lessons };
}

const count = async (uid, rows) =>
  (
    await strapi.documents(uid).findMany({
      filters: { id: { $in: rows.map((r) => r.id) } },
    })
  ).length;

describe('POST /droplets/:id/deep-delete', () => {
  it.each([
    ['a draft', { status: 'draft' }, { authorOnly: true }],
    ['an edit draft', { status: 'edit' }, { authorOnly: true }],
    ['a published droplet without authorOnly', { status: 'published' }, { authorOnly: false }],
    ['an in-review droplet without authorOnly', { status: 'draft', inReview: true }, { authorOnly: false }],
  ])('deletes %s and its lessons', async (_name, overrides, body) => {
    const { droplet, lessons } = await setup(overrides);
    const res = await deepDelete(droplet.id, body);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ dropletId: droplet.id, lessonsDeleted: 2 });
    expect(await count(DROPLET_UID, [droplet])).toBe(0);
    expect(await count(LESSON_UID, lessons)).toBe(0);
  });

  it.each([
    ['in review', { status: 'draft', inReview: true }, 409],
    ['published', { status: 'published' }, 403],
  ])('authorOnly refuses a droplet that is %s and deletes nothing', async (_n, overrides, status) => {
    const { droplet, lessons } = await setup(overrides);
    const res = await deepDelete(droplet.documentId, { authorOnly: true });
    expect(res.status).toBe(status);
    expect(await count(DROPLET_UID, [droplet])).toBe(1);
    expect(await count(LESSON_UID, lessons)).toBe(2);
  });

  it('rolls everything back when the droplet delete fails', async () => {
    const { droplet, lessons } = await setup({ status: 'draft' });
    const realDocuments = strapi.documents.bind(strapi);
    const spy = jest.spyOn(strapi, 'documents').mockImplementation((uid) => {
      const service = realDocuments(uid);
      if (uid !== DROPLET_UID) return service;
      return new Proxy(service, {
        get: (target, prop) =>
          prop === 'delete'
            ? async () => {
                throw new Error('forced failure');
              }
            : target[prop],
      });
    });
    let res;
    try {
      res = await deepDelete(droplet.id, { authorOnly: false });
    } finally {
      spy.mockRestore();
    }
    expect(res.status).toBe(500);
    expect(await count(DROPLET_UID, [droplet])).toBe(1);
    expect(await count(LESSON_UID, lessons)).toBe(2);
  });

  it.each([
    ['a missing droplet', '999999', { authorOnly: true }, 404],
    ['a bad id', '..%2Fx', { authorOnly: true }, 404],
    ['a missing authorOnly', 'x', {}, 400],
    ['an extra key', 'x', { authorOnly: true, y: 1 }, 400],
  ])('rejects %s', async (_n, ref, body, status) => {
    const target = status === 400 ? (await setup()).droplet.id : ref;
    expect((await deepDelete(target, body)).status).toBe(status);
  });
});
