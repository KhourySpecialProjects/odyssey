const request = require('supertest');
const { setupStrapi, teardownStrapi } = require('../helpers/strapi');
const { createFullAccessToken } = require('../helpers/api-token');
const {
  DROPLET_UID,
  USER_UID,
  OVERVIEW_SCAN_UID,
  dropletData,
  userData,
  overviewScanData,
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

describe('overview-scan (ODY-788)', () => {
  it('saves a scan for a droplet over REST and reads it back with its results', async () => {
    const droplet = await strapi.documents(DROPLET_UID).create({ data: dropletData() });
    const user = await strapi.documents(USER_UID).create({ data: userData() });
    const scan = overviewScanData();

    const created = await api('post', '/api/overview-scans').send({
      data: { ...scan, droplet: droplet.documentId, ranBy: user.documentId },
    });
    expect(created.status).toBe(201);

    const res = await api(
      'get',
      `/api/overview-scans?filters[droplet][id][$eq]=${droplet.id}` +
        '&populate[droplet][fields][0]=id&populate[ranBy][fields][0]=id'
    );
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([
      expect.objectContaining({
        rulesVersion: scan.rulesVersion,
        contentHash: scan.contentHash,
        passed: 22,
        needsAttention: 1,
        couldNotCheck: 0,
        results: scan.results,
        droplet: expect.objectContaining({ id: droplet.id }),
        ranBy: expect.objectContaining({ id: user.id }),
      }),
    ]);
  });

  it.each(['put', 'delete'])('has no %s route: a saved scan is never changed', async (method) => {
    const scan = await strapi.documents(OVERVIEW_SCAN_UID).create({ data: overviewScanData() });

    const res = await api(method, `/api/overview-scans/${scan.documentId}`).send({
      data: { passed: 0 },
    });

    expect(res.status).toBe(405);
    const after = await strapi.documents(OVERVIEW_SCAN_UID).findOne({ documentId: scan.documentId });
    expect(after.passed).toBe(22);
  });
});
