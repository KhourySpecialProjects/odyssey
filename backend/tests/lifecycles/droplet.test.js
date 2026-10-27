const request = require('supertest');
const { setupStrapi, teardownStrapi } = require('../helpers/strapi');
const { createFullAccessToken } = require('../helpers/api-token');
const { useSlackSpy } = require('../helpers/slack');
const {
  DROPLET_UID,
  LESSON_UID,
  USER_UID,
  dropletData,
  lessonData,
  userData,
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

  it('lists the populated lessons, authors and tags in the message', async () => {
    const lesson = await strapi
      .documents(LESSON_UID)
      .create({ data: lessonData({ name: unique('Populated Lesson') }) });
    const tag = await strapi
      .documents('api::tag.tag')
      .create({ data: { name: unique('populated-tag'), slug: 'placeholder' } });
    const droplet = await create({
      lessons: [lesson.documentId],
      tags: [tag.documentId],
    });
    await strapi.documents(USER_UID).create({
      data: userData({
        firstName: 'Radia',
        lastName: 'Perlman',
        droplets: [droplet.documentId],
      }),
    });
    slack.reset();

    await update(droplet.documentId, { status: 'edit' });

    const sends = slack.sends();
    expect(sends).toHaveLength(1);
    const blocks = JSON.stringify(sends[0].blocks);
    expect(blocks).toContain(lesson.name);
    expect(blocks).toContain(tag.name);
    expect(blocks).toContain('Radia Perlman');
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

  it('ignores reviewRound over REST and bumps on REST inReview', async () => {
    const { documentId } = await create();
    let res = await rest()
      .put(`/api/droplets/${documentId}`)
      .set(auth())
      .send({ data: { reviewRound: 50 } });
    expect(res.status).toBe(200);
    expect(await round(documentId)).toBe(0);

    res = await rest()
      .put(`/api/droplets/${documentId}`)
      .set(auth())
      .send({ data: { inReview: true } });
    expect(res.status).toBe(200);
    expect(await round(documentId)).toBe(1);
  });

  it('bumps and still notifies Slack on { status: edit, inReview: true }', async () => {
    const name = unique('Round Slack');
    const { documentId } = await create({ name });
    slack.reset();

    await update(documentId, { status: 'edit', inReview: true });

    expect(await round(documentId)).toBe(1);
    const sends = slack.sends();
    expect(sends).toHaveLength(1);
    expect(sends[0].text).toContain(name);
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
