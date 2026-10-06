const request = require('supertest');
const { setupStrapi, teardownStrapi } = require('../helpers/strapi');
const { createSuperAdminToken } = require('../helpers/admin-auth');
const { createFullAccessToken } = require('../helpers/api-token');
const { useSlackSpy } = require('../helpers/slack');
const {
  DROPLET_UID,
  LESSON_UID,
  VOYAGE_UID,
  dropletData,
  lessonData,
  voyageData,
} = require('../helpers/fixtures');

let strapi;
let adminToken;
let apiToken;
const slack = useSlackSpy();

const http = () => request(strapi.server.httpServer);
const adminAuth = () => ({ Authorization: `Bearer ${adminToken}` });
const cmUrl = (uid, documentId = '') =>
  `/content-manager/collection-types/${uid}${documentId ? `/${documentId}` : ''}`;
const createDroplet = (overrides) =>
  strapi.documents(DROPLET_UID).create({ data: dropletData(overrides) });
const createVoyage = (overrides) =>
  strapi.documents(VOYAGE_UID).create({ data: voyageData(overrides) });
const stored = (uid, documentId) => strapi.documents(uid).findOne({ documentId });

beforeAll(async () => {
  strapi = await setupStrapi();
  adminToken = await createSuperAdminToken(strapi);
  apiToken = await createFullAccessToken(strapi);
});

afterAll(async () => {
  await teardownStrapi();
});

describe('admin content-manager read path (own status attribute)', () => {
  it('edit view returns the stored droplet status, including edit', async () => {
    const droplet = await createDroplet({ status: 'edit' });
    const res = await http().get(cmUrl(DROPLET_UID, droplet.documentId)).set(adminAuth());
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('edit');
  });

  it('edit view returns the stored voyage status', async () => {
    const voyage = await createVoyage({ status: 'draft' });
    const res = await http().get(cmUrl(VOYAGE_UID, voyage.documentId)).set(adminAuth());
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('draft');
  });

  it('list view returns the stored status, not a computed D&P status', async () => {
    const droplet = await createDroplet({ status: 'edit' });
    const res = await http()
      .get(`${cmUrl(DROPLET_UID)}?page=1&pageSize=100`)
      .set(adminAuth());
    expect(res.status).toBe(200);
    const row = res.body.results.find((r) => r.documentId === droplet.documentId);
    expect(row.status).toBe('edit');
  });

  it('a voyage PUT changes only status and returns it', async () => {
    const voyage = await createVoyage({ status: 'draft' });
    const res = await http()
      .put(cmUrl(VOYAGE_UID, voyage.documentId))
      .set(adminAuth())
      .send({ name: voyage.name, slug: voyage.slug, status: 'published' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('published');

    const after = await stored(VOYAGE_UID, voyage.documentId);
    expect(after.status).toBe('published');
    expect(after.name).toBe(voyage.name);
    expect(after.slug).toBe(voyage.slug);
  });

  it('leaves types without a status attribute untouched', async () => {
    const lesson = await strapi.documents(LESSON_UID).create({ data: lessonData() });
    const res = await http().get(cmUrl(LESSON_UID, lesson.documentId)).set(adminAuth());
    expect(res.status).toBe(200);
    expect(res.body.data).not.toHaveProperty('status');
  });

  it('public REST still returns droplet status', async () => {
    const droplet = await createDroplet({ status: 'edit' });
    const res = await http()
      .get(`/api/droplets/${droplet.documentId}`)
      .set('Authorization', `Bearer ${apiToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('edit');
  });
});

describe('admin content-manager write path (status outside draft|published)', () => {
  it('saves an edit droplet without touching status', async () => {
    const droplet = await createDroplet({ status: 'edit' });
    const res = await http()
      .put(cmUrl(DROPLET_UID, droplet.documentId))
      .set(adminAuth())
      .send({ name: `${droplet.name} renamed`, status: 'edit' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('edit');

    const after = await stored(DROPLET_UID, droplet.documentId);
    expect(after.name).toBe(`${droplet.name} renamed`);
    expect(after.status).toBe('edit');
  });

  it('moves a draft droplet to edit and fires the review alert once', async () => {
    const droplet = await createDroplet({ status: 'draft' });
    slack.reset();
    const res = await http()
      .put(cmUrl(DROPLET_UID, droplet.documentId))
      .set(adminAuth())
      .send({ name: droplet.name, status: 'edit' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('edit');
    expect((await stored(DROPLET_UID, droplet.documentId)).status).toBe('edit');
    expect(slack.sends()).toHaveLength(1);
  });

  it('creates a droplet with status edit', async () => {
    const res = await http()
      .post(cmUrl(DROPLET_UID))
      .set(adminAuth())
      .send({ ...dropletData(), status: 'edit' });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('edit');
    expect((await stored(DROPLET_UID, res.body.data.documentId)).status).toBe('edit');
  });

  it('still rejects an unknown status value', async () => {
    const droplet = await createDroplet({ status: 'draft' });
    const res = await http()
      .put(cmUrl(DROPLET_UID, droplet.documentId))
      .set(adminAuth())
      .send({ name: droplet.name, status: 'bogus' });
    expect(res.status).toBe(400);
    expect((await stored(DROPLET_UID, droplet.documentId)).status).toBe('draft');
  });
});
