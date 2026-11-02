const request = require('supertest');
const { setupStrapi, teardownStrapi } = require('../helpers/strapi');
const { createFullAccessToken } = require('../helpers/api-token');
const { useSlackSpy } = require('../helpers/slack');
const {
  DROPLET_UID,
  dropletData,
  unique,
} = require('../helpers/fixtures');

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

describe('droplet updates send no Slack message', () => {
  it.each([
    ['draft -> edit', {}, { status: 'edit' }],
    ['edit -> edit', { status: 'edit' }, { status: 'edit' }],
    ['edit -> published', { status: 'edit' }, { status: 'published' }],
    ['draft -> published', {}, { status: 'published' }],
    ['draft -> inReview (Document Service)', {}, { inReview: true }],
    ['an edit to an in-review droplet', { inReview: true }, { description: 'x' }],
  ])('%s', async (_label, start, change) => {
    const droplet = await create(start);
    slack.reset();

    await update(droplet.documentId, change);

    expect(slack.sends()).toHaveLength(0);
  });

  it('does not send on create, even when created directly in edit', async () => {
    await create({ status: 'edit' });
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

  it('PUT with status edit succeeds and sends nothing', async () => {
    const droplet = await create();
    slack.reset();

    const res = await rest()
      .put(`/api/droplets/${droplet.documentId}`)
      .set(auth())
      .send({ data: { status: 'edit' } });

    expect(res.status).toBe(200);
    expect(slack.sends()).toHaveLength(0);
  });

  // ODY-700: v5's strict REST validation must let regenerateSlug reach beforeUpdate.
  test('PUT with regenerateSlug regenerates the slug (ODY-700)', async () => {
    const droplet = await create();
    const res = await rest()
      .put(`/api/droplets/${droplet.documentId}`)
      .set(auth())
      .send({ data: { name: unique('REST Renamed'), regenerateSlug: true } });

    expect(res.status).toBe(200);
    expect(res.body.data.slug).toMatch(/^rest-renamed-/);
  });
});

describe('droplet reviewRound', () => {
  const round = async (documentId) =>
    (await strapi.documents(DROPLET_UID).findOne({ documentId })).reviewRound;

  it('starts at 0 on create, 1 when created in review, and ignores a sent value', async () => {
    expect((await create()).reviewRound).toBe(0);
    expect((await create({ inReview: true })).reviewRound).toBe(1);
    expect((await create({ reviewRound: 9 })).reviewRound).toBe(0);
    expect((await create({ inReview: true, reviewRound: 9 })).reviewRound).toBe(1);
  });

  it('keeps a clone of an in-review droplet consistent (round >= 1)', async () => {
    const source = await create({ inReview: true });
    await update(source.documentId, { inReview: false });
    await update(source.documentId, { inReview: true });
    // clone merges the source row into the create data; name and slug must be overridden (unique).
    const name = unique('Clone Round');
    const clone = await strapi
      .documents(DROPLET_UID)
      .clone({ documentId: source.documentId, data: { name, slug: name.toLowerCase().replace(/ /g, '-') } });
    const row = await strapi.documents(DROPLET_UID).findOne({ documentId: clone.documentId });
    expect(row.inReview).toBe(true);
    expect(row.reviewRound).toBeGreaterThanOrEqual(1);
  });

  it('bumps the right droplet on a Query Engine update keyed by documentId', async () => {
    const a = await create();
    const b = await create({ inReview: true });
    await strapi.db.transaction(() =>
      strapi.db.query(DROPLET_UID).update({ where: { documentId: a.documentId }, data: { inReview: true } })
    );
    expect(await round(a.documentId)).toBe(1);
    expect(await round(b.documentId)).toBe(1);
  });

  it('does not throw on a Query Engine update with neither id nor documentId', async () => {
    const a = await create();
    await expect(
      strapi.db.transaction(() =>
        strapi.db.query(DROPLET_UID).update({ where: { name: a.name }, data: { inReview: true } })
      )
    ).resolves.toBeDefined();
    expect(await round(a.documentId)).toBe(0);
  });

  it('bumps only when inReview turns true (withdraw + resubmit is a new round)', async () => {
    const { documentId } = await create();
    await update(documentId, { inReview: true });
    expect(await round(documentId)).toBe(1);
    await update(documentId, { inReview: true });
    expect(await round(documentId)).toBe(1);
    await update(documentId, { inReview: false });
    expect(await round(documentId)).toBe(1);
    await update(documentId, { inReview: true });
    expect(await round(documentId)).toBe(2);
  });

  it('ignores unrelated updates and a client-sent reviewRound', async () => {
    const { documentId } = await create({ inReview: true });
    await update(documentId, { name: unique('Renamed Round') });
    expect(await round(documentId)).toBe(1);
    await update(documentId, { reviewRound: 50 });
    expect(await round(documentId)).toBe(1);
  });

  it('ignores a reviewRound sent over REST', async () => {
    const { documentId } = await create();
    const res = await rest()
      .put(`/api/droplets/${documentId}`)
      .set(auth())
      .send({ data: { reviewRound: 50 } });
    expect(res.status).toBe(200);
    expect(await round(documentId)).toBe(0);
  });

  it('rejects inReview over REST with 400 and writes nothing', async () => {
    const { documentId } = await create();
    const res = await rest()
      .put(`/api/droplets/${documentId}`)
      .set(auth())
      .send({ data: { inReview: true } });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe(
      'inReview can only change through the review routes.'
    );
    const row = await strapi.documents(DROPLET_UID).findOne({ documentId });
    expect(row.inReview).toBeFalsy();
    expect(row.reviewRound).toBe(0);
  });

  it('still accepts other keys over REST', async () => {
    const { documentId } = await create();
    const name = unique('REST Other Key');
    const res = await rest()
      .put(`/api/droplets/${documentId}`)
      .set(auth())
      .send({ data: { name } });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe(name);
  });

  it('bumps the round and sends nothing on { status: edit, inReview: true }', async () => {
    const { documentId } = await create();
    slack.reset();

    await update(documentId, { status: 'edit', inReview: true });

    expect(await round(documentId)).toBe(1);
    expect(slack.sends()).toHaveLength(0);
  });

  it('records one bump for two submits (SQLite runs the transactions serially)', async () => {
    const { documentId } = await create();
    const results = await Promise.allSettled([
      update(documentId, { inReview: true }),
      update(documentId, { inReview: true }),
    ]);
    expect(results.map((r) => r.status)).toEqual(['fulfilled', 'fulfilled']);
    expect(await round(documentId)).toBe(1);
  });
});
