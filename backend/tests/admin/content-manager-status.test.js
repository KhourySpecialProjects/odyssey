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
    expect(row).toBeDefined();
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
    slack.reset();
    const res = await http()
      .put(cmUrl(DROPLET_UID, droplet.documentId))
      .set(adminAuth())
      .send({ name: `${droplet.name} renamed`, status: 'edit' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('edit');
    expect(slack.sends()).toHaveLength(0);

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
    expect(JSON.stringify(res.body)).not.toContain('Invalid status');
    expect((await stored(DROPLET_UID, droplet.documentId)).status).toBe('draft');
  });

  it('clones a droplet with status edit', async () => {
    const source = await createDroplet({ status: 'edit' });
    const res = await http()
      .post(`${cmUrl(DROPLET_UID)}/clone/${source.documentId}`)
      .set(adminAuth())
      .send({ ...dropletData(), status: 'edit' });
    expect(res.status).toBe(200);
    expect(res.body.data.documentId).not.toBe(source.documentId);
    expect((await stored(DROPLET_UID, res.body.data.documentId)).status).toBe('edit');
  });

  it('logs an error when the stashed status is never restored', async () => {
    const { wrapCollectionTypesController } = require('../../dist/src/extensions/content-manager/own-status');
    const controller = { create: jest.fn(async () => {}), update: jest.fn(async () => {}), clone: jest.fn(async () => {}) };
    wrapCollectionTypesController(controller);
    const logError = jest.spyOn(strapi.log, 'error').mockImplementation(() => {});
    const ctx = { params: { model: DROPLET_UID, id: 'abc' }, request: { body: { status: 'edit' } }, state: {} };
    await controller.update(ctx);
    expect(logError).toHaveBeenCalledWith(expect.stringContaining('ODY-699'));
    expect(logError).toHaveBeenCalledWith(expect.stringContaining('edit'));
    logError.mockRestore();
  });

  it('resolves both wrapped services during bootstrap', async () => {
    const plugin = require('../../dist/src/extensions/content-manager/strapi-server').default({
      services: { 'document-metadata': () => ({}), 'document-manager': () => ({}) },
      controllers: { 'collection-types': { create() {}, update() {}, clone() {}, autoClone() {} } },
    });
    const service = jest.fn();
    const spy = jest.spyOn(strapi, 'plugin').mockReturnValue({ service });
    await plugin.bootstrap({ strapi });
    spy.mockRestore();
    expect(service.mock.calls.map(([n]) => n).sort()).toEqual(['document-manager', 'document-metadata']);
  });
});
