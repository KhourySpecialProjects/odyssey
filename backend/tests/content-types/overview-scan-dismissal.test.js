const request = require('supertest');
const { setupStrapi, teardownStrapi } = require('../helpers/strapi');
const { createFullAccessToken } = require('../helpers/api-token');
const {
  DROPLET_UID,
  USER_UID,
  OVERVIEW_SCAN_DISMISSAL_UID,
  dropletData,
  userData,
  dismissalData,
} = require('../helpers/fixtures');

let strapi;
let token;

const api = (method, path) =>
  request(strapi.server.httpServer)[method](path).set('Authorization', `Bearer ${token}`);

beforeAll(async () => {
  strapi = await setupStrapi();
  token = await createFullAccessToken(strapi);
});

afterAll(async () => {
  await teardownStrapi();
});

describe('overview-scan-dismissal (ODY-905)', () => {
  it('saves a dismissal over REST and finds it by droplet, a null blockId and its message', async () => {
    const droplet = await strapi.documents(DROPLET_UID).create({ data: dropletData() });
    const user = await strapi.documents(USER_UID).create({ data: userData() });

    const created = await api('post', '/api/overview-scan-dismissals').send({
      data: {
        ...dismissalData({ blockId: null, message: 'Has "quotes" & symbols.' }),
        droplet: droplet.documentId,
        dismissedBy: user.documentId,
      },
    });
    expect(created.status).toBe(201);
    await strapi
      .documents(OVERVIEW_SCAN_DISMISSAL_UID)
      .create({ data: { ...dismissalData(), droplet: droplet.documentId } });

    const res = await api(
      'get',
      `/api/overview-scan-dismissals?filters[droplet][id][$eq]=${droplet.id}` +
        '&filters[blockId][$null]=true' +
        `&filters[message][$eq]=${encodeURIComponent('Has "quotes" & symbols.')}` +
        '&populate[dismissedBy][fields][0]=firstName'
    );
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([
      expect.objectContaining({
        checkId: 'style',
        ruleId: 'sentence-case',
        partId: '1',
        blockId: null,
        message: 'Has "quotes" & symbols.',
        createdAt: expect.any(String),
        dismissedBy: expect.objectContaining({ id: user.id }),
      }),
    ]);
  });

  it('deletes a dismissal, which is how Undo works', async () => {
    const row = await strapi
      .documents(OVERVIEW_SCAN_DISMISSAL_UID)
      .create({ data: dismissalData() });

    const res = await api('delete', `/api/overview-scan-dismissals/${row.documentId}`);

    expect(res.status).toBe(204);
    expect(
      await strapi.documents(OVERVIEW_SCAN_DISMISSAL_UID).findOne({ documentId: row.documentId })
    ).toBeNull();
  });

  it('has no put route: a dismissal is never edited', async () => {
    const row = await strapi
      .documents(OVERVIEW_SCAN_DISMISSAL_UID)
      .create({ data: dismissalData() });

    const res = await api('put', `/api/overview-scan-dismissals/${row.documentId}`).send({
      data: { message: 'changed' },
    });

    expect(res.status).toBe(405);
  });

  it('requires the flag fields', async () => {
    const res = await api('post', '/api/overview-scan-dismissals').send({
      data: { checkId: 'style' },
    });
    expect(res.status).toBe(400);
  });
});
