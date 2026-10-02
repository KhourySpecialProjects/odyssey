const request = require('supertest');
const { setupStrapi, teardownStrapi } = require('../helpers/strapi');
const { createFullAccessToken } = require('../helpers/api-token');
const { useSlackSpy } = require('../helpers/slack');
const { DROPLET_UID, dropletData, unique } = require('../helpers/fixtures');

let strapi;
let token;
const slack = useSlackSpy();

const create = (overrides) =>
  strapi.documents(DROPLET_UID).create({ data: dropletData(overrides) });
const update = (documentId, data) =>
  strapi.documents(DROPLET_UID).update({ documentId, data });
const rest = () => request(strapi.server.httpServer);
const auth = () => ({ Authorization: `Bearer ${token}` });

beforeAll(async () => {
  strapi = await setupStrapi();
  token = await createFullAccessToken(strapi);
});

afterAll(async () => {
  await teardownStrapi();
});

describe('droplet beforeCreate', () => {
  it('generates the slug from the name', async () => {
    const droplet = await create({ name: unique('Intro to Git') });
    expect(droplet.slug).toMatch(/^intro-to-git-/);
  });

  // Contract: REST and document-service creates must send a slug (any value);
  // beforeCreate replaces it. v5 validates required fields before the hook
  // runs, so omitting it is rejected. Every frontend create sends a placeholder.
  it('rejects a create that sends no slug', async () => {
    const { slug, ...withoutSlug } = dropletData({ name: unique('No Slug') });
    await expect(
      strapi.documents(DROPLET_UID).create({ data: withoutSlug })
    ).rejects.toThrow('slug must be defined');
  });

  it('appends -1 when the slug is already taken', async () => {
    // Droplet.name is unique, so the second name differs only by a doubled
    // space; both slugify to the same slug.
    const base = unique('slug clash').toLowerCase();
    const first = await create({ name: base });
    const second = await create({ name: base.replace(' ', '  ') });
    expect(second.slug).toBe(`${first.slug}-1`);
  });
});

describe('droplet beforeUpdate (regenerateSlug)', () => {
  it('regenerates the slug from the new name when regenerateSlug is true', async () => {
    const droplet = await create();
    const newName = unique('Renamed Droplet');

    const updated = await update(droplet.documentId, {
      name: newName,
      regenerateSlug: true,
    });

    expect(updated.slug).toMatch(/^renamed-droplet-/);
    expect(updated.slug).not.toBe(droplet.slug);
    expect(updated).not.toHaveProperty('regenerateSlug');
  });

  it.each([
    ['false', { regenerateSlug: false }],
    ['missing', {}],
  ])('keeps the slug when regenerateSlug is %s', async (_label, extra) => {
    const droplet = await create();

    const updated = await update(droplet.documentId, {
      name: unique('Renamed Without Slug'),
      ...extra,
    });

    expect(updated.slug).toBe(droplet.slug);
  });

  it('never stores regenerateSlug', async () => {
    const droplet = await create();
    await update(droplet.documentId, {
      name: unique('Stored Check'),
      regenerateSlug: true,
    });

    const [row] = await strapi.db
      .query(DROPLET_UID)
      .findMany({ where: { documentId: droplet.documentId } });
    expect(row).not.toHaveProperty('regenerateSlug');
  });
});

describe('droplet afterUpdate (Slack on entering edit)', () => {
  it('sends exactly one message on draft -> edit, naming the droplet', async () => {
    const name = unique('Review Me');
    const droplet = await create({ name });
    slack.reset();

    await update(droplet.documentId, { status: 'edit' });

    const sends = slack.sends();
    expect(sends).toHaveLength(1);
    expect(sends[0].text).toContain(name);
    expect(JSON.stringify(sends[0].blocks)).toContain(name);
  });

  it('links the droplet to its draft review page when FRONTEND_URL is set', async () => {
    process.env.FRONTEND_URL = 'https://odyssey.test';
    try {
      const droplet = await create();
      slack.reset();
      await update(droplet.documentId, { status: 'edit' });

      expect(JSON.stringify(slack.sends()[0].blocks)).toContain(
        `https://odyssey.test/draft/d/${droplet.slug}`
      );
    } finally {
      delete process.env.FRONTEND_URL;
    }
  });

  it('does not send on create, even when created directly in edit', async () => {
    // Characterization: there is no afterCreate hook, so a droplet created
    // straight into "edit" never notifies Slack.
    await create({ status: 'edit' });
    expect(slack.sends()).toHaveLength(0);
  });

  it('does not send on edit -> edit', async () => {
    const droplet = await create();
    await update(droplet.documentId, { status: 'edit' });
    slack.reset();

    await update(droplet.documentId, { status: 'edit' });

    expect(slack.sends()).toHaveLength(0);
  });

  it('does not send when an update leaves status alone', async () => {
    const droplet = await create();
    await update(droplet.documentId, { status: 'edit' });
    slack.reset();

    await update(droplet.documentId, { description: 'Just a description' });

    expect(slack.sends()).toHaveLength(0);
  });

  it('does not send on edit -> published', async () => {
    const droplet = await create();
    await update(droplet.documentId, { status: 'edit' });
    slack.reset();

    await update(droplet.documentId, { status: 'published' });

    expect(slack.sends()).toHaveLength(0);
  });

  it('does not send on draft -> published', async () => {
    const droplet = await create();
    slack.reset();

    await update(droplet.documentId, { status: 'published' });

    expect(slack.sends()).toHaveLength(0);
  });
});

describe('droplet delete', () => {
  it('runs no create/update hooks and sends nothing', async () => {
    const droplet = await create();
    await update(droplet.documentId, { status: 'edit' });
    slack.reset();

    await strapi.documents(DROPLET_UID).delete({ documentId: droplet.documentId });

    expect(slack.sends()).toHaveLength(0);
    expect(
      await strapi.documents(DROPLET_UID).findOne({ documentId: droplet.documentId })
    ).toBeNull();
  });
});

describe('droplet over REST', () => {
  it('POST creates the droplet with a generated slug and sends nothing', async () => {
    const name = unique('REST Droplet');
    const res = await rest()
      .post('/api/droplets')
      .set(auth())
      .send({ data: dropletData({ name }) });

    expect(res.status).toBe(201);
    expect(res.body.data.slug).toMatch(/^rest-droplet-/);
    expect(slack.sends()).toHaveLength(0);
  });

  it('PUT with status edit sends exactly one message', async () => {
    const name = unique('REST Review');
    const droplet = await create({ name });
    slack.reset();

    const res = await rest()
      .put(`/api/droplets/${droplet.documentId}`)
      .set(auth())
      .send({ data: { status: 'edit' } });

    expect(res.status).toBe(200);
    const sends = slack.sends();
    expect(sends).toHaveLength(1);
    expect(sends[0].text).toContain(name);
  });

  // ODY-700: the REST controller rejects unknown body keys with
  // "400 Invalid key regenerateSlug" before the lifecycle hook runs, so the
  // frontend's regenerateSlug flag never reaches beforeUpdate over REST. When
  // ODY-700 lands this starts passing, Jest flags it, and it becomes a plain
  // test().
  test.failing('PUT with regenerateSlug regenerates the slug (ODY-700)', async () => {
    const droplet = await create();
    const res = await rest()
      .put(`/api/droplets/${droplet.documentId}`)
      .set(auth())
      .send({ data: { name: unique('REST Renamed'), regenerateSlug: true } });

    expect(res.status).toBe(200);
    expect(res.body.data.slug).toMatch(/^rest-renamed-/);
  });
});
