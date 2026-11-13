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

const BOTH = { refuseInReview: true, refusePublished: true };
const NEITHER = { refuseInReview: false, refusePublished: false };

const count = async (uid, rows) =>
  (
    await strapi.documents(uid).findMany({
      filters: { id: { $in: rows.map((r) => r.id) } },
    })
  ).length;

describe('POST /droplets/:id/deep-delete', () => {
  it.each([
    ['a draft', { status: 'draft' }, BOTH],
    ['an edit draft', { status: 'edit' }, BOTH],
    ['a published droplet with refusePublished false', { status: 'published' }, { refuseInReview: true, refusePublished: false }],
    ['a published droplet with both flags false', { status: 'published' }, NEITHER],
    ['an in-review droplet with refuseInReview false', { status: 'draft', inReview: true }, { refuseInReview: false, refusePublished: true }],
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
  ])('the flags refuse a droplet that is %s and delete nothing', async (_n, overrides, status) => {
    const { droplet, lessons } = await setup(overrides);
    const res = await deepDelete(droplet.documentId, BOTH);
    expect(res.status).toBe(status);
    expect(await count(DROPLET_UID, [droplet])).toBe(1);
    expect(await count(LESSON_UID, lessons)).toBe(2);
  });

  it('refuses an in-review droplet for a privileged author (refuseInReview only)', async () => {
    const { droplet, lessons } = await setup({ status: 'published', inReview: true });
    const res = await deepDelete(droplet.id, { refuseInReview: true, refusePublished: false });
    expect(res.status).toBe(409);
    expect(await count(DROPLET_UID, [droplet])).toBe(1);
    expect(await count(LESSON_UID, lessons)).toBe(2);
  });

  it('keeps a lesson that another droplet still uses', async () => {
    const { droplet, lessons } = await setup({ status: 'draft' });
    const other = await strapi.documents(DROPLET_UID).create({
      data: dropletData({ lessons: [lessons[0].documentId] }),
    });
    const res = await deepDelete(droplet.id, BOTH);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ dropletId: droplet.id, lessonsDeleted: 1 });
    expect(await count(DROPLET_UID, [droplet])).toBe(0);
    expect(await count(LESSON_UID, [lessons[0]])).toBe(1);
    expect(await count(LESSON_UID, [lessons[1]])).toBe(0);
    const kept = await strapi.documents(DROPLET_UID).findFirst({
      filters: { id: other.id },
      populate: { lessons: { fields: ['id'] } },
    });
    expect(kept.lessons.map((l) => l.id)).toEqual([lessons[0].id]);
  });

  it.each([
    ['the droplet delete', DROPLET_UID],
    ['a lesson delete', LESSON_UID],
  ])('rolls everything back when %s fails', async (_n, failingUid) => {
    const { droplet, lessons } = await setup({ status: 'draft' });
    const realDocuments = strapi.documents.bind(strapi);
    let lessonDeletes = 0;
    const spy = jest.spyOn(strapi, 'documents').mockImplementation((uid) => {
      const service = realDocuments(uid);
      if (uid !== failingUid) return service;
      return new Proxy(service, {
        get: (target, prop) =>
          prop === 'delete'
            ? async (...args) => {
                // For lessons, let the first delete succeed so the failure is mid-loop.
                if (uid === LESSON_UID && lessonDeletes++ === 0) {
                  return target.delete(...args);
                }
                throw new Error('forced failure');
              }
            : target[prop],
      });
    });
    let res;
    try {
      res = await deepDelete(droplet.id, NEITHER);
    } finally {
      spy.mockRestore();
    }
    expect(res.status).toBe(500);
    expect(await count(DROPLET_UID, [droplet])).toBe(1);
    expect(await count(LESSON_UID, lessons)).toBe(2);
  });

  it.each([
    ['a missing droplet', '999999', BOTH, 404],
    ['a bad id', '..%2Fx', BOTH, 404],
    ['an empty body', 'x', {}, 400],
    ['one missing flag', 'x', { refuseInReview: true }, 400],
    ['a non-boolean flag', 'x', { refuseInReview: 'yes', refusePublished: true }, 400],
    ['the old authorOnly key', 'x', { authorOnly: true }, 400],
    ['an extra key', 'x', { ...BOTH, y: 1 }, 400],
  ])('rejects %s', async (_n, ref, body, status) => {
    const target = status === 400 ? (await setup()).droplet.id : ref;
    expect((await deepDelete(target, body)).status).toBe(status);
  });
});
