const request = require('supertest');
const { setupStrapi, teardownStrapi } = require('../helpers/strapi');
const { createFullAccessToken } = require('../helpers/api-token');
const { expectUniqueViolation } = require('../helpers/unique');
const {
  USER_UID,
  TAG_UID,
  LEARNER_PROFILE_UID,
  unique,
  userData,
  learnerProfileData,
} = require('../helpers/fixtures');

let strapi;
let token;

const api = (method, path) =>
  request(strapi.server.httpServer)[method](path).set('Authorization', `Bearer ${token}`);

const makeTag = () => {
  const name = unique('Tag');
  return strapi.documents(TAG_UID).create({
    data: { name, slug: name.toLowerCase().replace(/\s+/g, '-') },
  });
};

// Saves a profile over REST for a fresh user with two tags.
async function makeProfile(overrides = {}) {
  const user = await strapi.documents(USER_UID).create({ data: userData() });
  const tags = [await makeTag(), await makeTag()];
  const res = await api('post', '/api/learner-profiles').send({
    data: {
      ...learnerProfileData({ interestNote: 'Robotics' }),
      user: user.documentId,
      interests: { set: tags.map((t) => t.documentId) },
      ...overrides,
    },
  });
  return { user, tags, res };
}

beforeAll(async () => {
  strapi = await setupStrapi();
  token = await createFullAccessToken(strapi);
});

afterAll(async () => {
  await teardownStrapi();
});

describe('learner-profile (ODY-953)', () => {
  it('saves a profile and reads it the way getLearnerProfile does', async () => {
    const { user, tags, res } = await makeProfile();
    expect(res.status).toBe(201);

    const read = await api(
      'get',
      `/api/learner-profiles?filters[user][id][$eq]=${user.id}` +
        '&fields[0]=goal&fields[1]=focusAreas&fields[2]=interestNote' +
        '&populate[interests][fields][0]=name&populate[interests][fields][1]=slug'
    );

    expect(read.status).toBe(200);
    expect(read.body.data).toHaveLength(1);
    expect(read.body.data[0]).toMatchObject({
      goal: 'career',
      focusAreas: ['technical'],
      interestNote: 'Robotics',
    });
    expect(read.body.data[0].interests.map((t) => t.id).sort()).toEqual(
      tags.map((t) => t.id).sort()
    );
  });

  it('keeps one interest and the goal after an interests set', async () => {
    const { tags, res } = await makeProfile();

    const put = await api('put', `/api/learner-profiles/${res.body.data.documentId}`).send({
      data: { interests: { set: [tags[0].documentId] } },
    });
    expect(put.status).toBe(200);

    const row = await strapi
      .documents(LEARNER_PROFILE_UID)
      .findOne({ documentId: res.body.data.documentId, populate: ['interests'] });
    expect(row.goal).toBe('career');
    expect(row.interests.map((t) => t.id)).toEqual([tags[0].id]);
  });

  it('starts a new user with a null onboardedAt and stores it on update', async () => {
    const user = await strapi.documents(USER_UID).create({ data: userData() });
    const before = await api('get', `/api/authorized-users/${user.documentId}`);
    expect(before.body.data.onboardedAt).toBeNull();

    const when = new Date().toISOString();
    const put = await api('put', `/api/authorized-users/${user.documentId}`).send({
      data: { onboardedAt: when },
    });

    expect(put.status).toBe(200);
    expect(new Date(put.body.data.onboardedAt).toISOString()).toBe(when);
    expect(put.body.data.firstTime).toBe(before.body.data.firstTime);
  });

  it.each([
    ['a goal outside the list', { goal: 'work' }],
    ['a 201-character note', { interestNote: 'x'.repeat(201) }],
    ['an unknown key', { difficulty: 'beginner' }],
  ])('rejects %s with 400', async (_label, extra) => {
    const { res } = await makeProfile(extra);
    expect(res.status).toBe(400);
  });

  it('rejects a duplicate key at the database level (unique index)', async () => {
    const key = '9001';
    await expectUniqueViolation(
      strapi.db.transaction(async () => {
        const q = strapi.db.query(LEARNER_PROFILE_UID);
        await q.create({ data: { documentId: 'lpdupa', key } });
        await q.create({ data: { documentId: 'lpdupb', key } });
      }),
      { table: 'learner_profiles', column: 'key', index: 'learner_profiles_key_uq' }
    );
  });

  it('has no delete route', async () => {
    const { res } = await makeProfile();
    const del = await api('delete', `/api/learner-profiles/${res.body.data.documentId}`);
    expect(del.status).toBe(405);
  });

  it('is not reachable from the user or tag queries', async () => {
    const { user, tags } = await makeProfile({ interestNote: 'zzprivatenote' });

    const userRes = await api('get', `/api/authorized-users/${user.documentId}?populate=*`);
    const tagRes = await api('get', `/api/tags?populate=*&filters[id][$eq]=${tags[0].id}`);

    for (const res of [userRes, tagRes]) {
      expect(res.status).toBe(200);
      const body = JSON.stringify(res.body);
      expect(body).not.toMatch(/learnerProfile|learner_profiles|"goal"|focusAreas|interestNote/);
      expect(body).not.toContain('zzprivatenote');
    }
    expect(tagRes.body.data).toHaveLength(1);
  });

  it('is the only type with a relation that targets it', () => {
    const target = 'api::learner-profile.learner-profile';
    const pointing = [
      ...Object.entries(strapi.contentTypes),
      ...Object.entries(strapi.components),
    ]
      .filter(([uid]) => uid !== target)
      .flatMap(([uid, ct]) =>
        Object.entries(ct.attributes)
          .filter(([, attr]) => attr.target === target)
          .map(([name]) => `${uid}.${name}`)
      );
    expect(pointing).toEqual([]);
  });
});
