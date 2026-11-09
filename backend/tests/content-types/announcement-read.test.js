const request = require('supertest');
const { setupStrapi, teardownStrapi } = require('../helpers/strapi');
const { createFullAccessToken } = require('../helpers/api-token');
const { ANNOUNCEMENT_UID, ANNOUNCEMENT_READ_UID, USER_UID, userData } = require('../helpers/fixtures');

let strapi;
let token;

const api = (method, path) =>
  request(strapi.server.httpServer)[method](path).set('Authorization', `Bearer ${token}`);

const makeAnnouncement = (overrides = {}) =>
  strapi.documents(ANNOUNCEMENT_UID).create({
    data: { type: 'droplet', content: 'Updated.', firstCreated: new Date().toISOString(), ...overrides },
  });
const makeUser = () => strapi.documents(USER_UID).create({ data: userData() });
const markRead = (announcement, user) =>
  strapi.documents(ANNOUNCEMENT_READ_UID).create({
    data: { announcement: announcement.documentId, authorized_user: user.documentId },
  });

// The filters fetchAnnouncements sends. Unread is "not in the user's read ids":
// a negated relation filter ($not) is wrong when another user also read the row.
const readBy = (user) => `filters[reads][authorized_user][id][$eq]=${user.id}`;
const unreadBy = async (user) => {
  const res = await api(
    'get',
    `/api/announcement-reads?filters[authorized_user][id][$eq]=${user.id}` +
      '&fields[0]=id&populate[announcement][fields][0]=id&pagination[pageSize]=250'
  );
  expect(res.status).toBe(200);
  const readIds = res.body.data.map((r) => r.announcement.id);
  return readIds.length
    ? readIds.map((id, i) => `filters[id][$notIn][${i}]=${id}`).join('&')
    : 'filters[id][$gt]=0';
};
const ids = async (query) => {
  const res = await api('get', `/api/announcements?${query}&pagination[pageSize]=100`);
  expect(res.status).toBe(200);
  return res.body.data.map((a) => a.id);
};

beforeAll(async () => {
  strapi = await setupStrapi();
  token = await createFullAccessToken(strapi);
});

afterAll(async () => {
  await teardownStrapi();
});

describe('announcement-read (ODY-786)', () => {
  it('creates and deletes a read mark over REST, and has no put route', async () => {
    const announcement = await makeAnnouncement();
    const user = await makeUser();

    const created = await api('post', '/api/announcement-reads').send({
      data: { announcement: announcement.documentId, authorized_user: user.documentId },
    });
    expect(created.status).toBe(201);

    const put = await api('put', `/api/announcement-reads/${created.body.data.documentId}`).send({
      data: {},
    });
    expect(put.status).toBe(405);

    const del = await api('delete', `/api/announcement-reads/${created.body.data.documentId}`);
    expect(del.status).toBe(204);
  });

  it.each(['droplet', 'group', 'playlist', 'friend', 'kudos', 'system', 'review_feedback', 'review_published'])(
    'a %s announcement read by one user stays unread for another',
    async (type) => {
      const announcement = await makeAnnouncement({ type });
      const reader = await makeUser();
      const other = await makeUser();
      await markRead(announcement, reader);

      expect(await ids(readBy(reader))).toContain(announcement.id);
      expect(await ids(await unreadBy(reader))).not.toContain(announcement.id);
      expect(await ids(readBy(other))).not.toContain(announcement.id);
      expect(await ids(await unreadBy(other))).toContain(announcement.id);
    }
  );

  it('still lists an announcement as unread for a user when another user also read it', async () => {
    const announcement = await makeAnnouncement();
    const a = await makeUser();
    const b = await makeUser();
    const c = await makeUser();
    await markRead(announcement, a);
    await markRead(announcement, b);

    expect(await ids(await unreadBy(c))).toContain(announcement.id);
    expect(await ids(await unreadBy(a))).not.toContain(announcement.id);
    // Not a duplicate row per reader
    expect((await ids(readBy(a))).filter((id) => id === announcement.id)).toHaveLength(1);
  });
});
