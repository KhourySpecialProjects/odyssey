const request = require('supertest');
const { setupStrapi, teardownStrapi } = require('./helpers/strapi');
const { createFullAccessToken } = require('./helpers/api-token');

let strapi;
let token;

beforeAll(async () => {
  strapi = await setupStrapi();
  token = await createFullAccessToken(strapi);
});

afterAll(async () => {
  await teardownStrapi();
});

describe('Strapi boot', () => {
  it('runs Strapi v5 on SQLite in the test environment', () => {
    expect(strapi.config.get('environment')).toBe('test');
    expect(strapi.db.config.connection.client).toBe('sqlite');
  });

  it.each([
    'api::droplet.droplet',
    'api::lesson.lesson',
    'api::playlist.playlist',
    'api::creation-request.creation-request',
    'api::access-request.access-request',
    'api::authorized-user.authorized-user',
    'api::tag.tag',
  ])('registers the %s content type', (uid) => {
    expect(strapi.contentTypes[uid]).toBeDefined();
  });

  it('serves GET /api/tags with a full-access API token', async () => {
    const res = await request(strapi.server.httpServer)
      .get('/api/tags')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('rejects GET /api/tags without a token', async () => {
    const res = await request(strapi.server.httpServer).get('/api/tags');
    expect([401, 403]).toContain(res.status);
  });
});
