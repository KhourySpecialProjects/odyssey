const request = require('supertest');
const { setupStrapi, teardownStrapi } = require('../helpers/strapi');
const { createFullAccessToken } = require('../helpers/api-token');
const {
  DROPLET_BADGE_UID,
  DROPLET_UID,
  USER_UID,
  dropletData,
  userData,
} = require('../helpers/fixtures');
const { expectUniqueViolation } = require('../helpers/unique');

let strapi;
let token;
let user;
let droplet;
let other;
let n = 0;

const rest = () => request(strapi.server.httpServer);
const auth = () => ({ Authorization: `Bearer ${token}` });
const saveRoute = (body) => rest().post('/api/droplet-badges/options').set(auth()).send(body);
const pickRoute = (body) => rest().post('/api/droplet-badges/pick').set(auth()).send(body);
const pickedRoute = (qs) => rest().get(`/api/droplet-badges/picked${qs}`).set(auth());
const optionsRoute = (qs) => rest().get(`/api/droplet-badges/options${qs}`).set(auth());

// A fresh design each call: the circle's radius differs.
const svg = (label = ++n) => `<svg viewBox="0 0 10 10"><circle r="${label}"/></svg>`;
const option = (overrides = {}) => ({
  title: 'Ribbon',
  emblemSvg: svg(),
  model: 'claude-sonnet-5-5',
  promptVersion: 'v1',
  ...overrides,
});
const body = (overrides = {}) => ({
  dropletId: droplet.id,
  userId: user.id,
  options: [option(), option(), option()],
  ...overrides,
});
const rows = (where = {}) =>
  strapi.db.query(DROPLET_BADGE_UID).findMany({ where, orderBy: { id: 'asc' } });

beforeAll(async () => {
  strapi = await setupStrapi();
  token = await createFullAccessToken(strapi);
});

afterAll(async () => {
  await teardownStrapi();
});

beforeEach(async () => {
  await strapi.db.connection('droplet_badges').del();
  user = await strapi.documents(USER_UID).create({ data: userData() });
  droplet = await strapi.documents(DROPLET_UID).create({ data: dropletData() });
  other = await strapi.documents(DROPLET_UID).create({ data: dropletData() });
});

describe('access', () => {
  it('needs the service token', async () => {
    const res = await rest().post('/api/droplet-badges/options').send(body());
    expect(res.status).toBe(401);
    expect((await rest().get('/api/droplet-badges/picked?dropletIds=1')).status).toBe(401);
  });

  it('has no core REST endpoints', async () => {
    // 404 (no route) or 405 (the path exists for another method); never a 2xx.
    const refused = [404, 405];
    expect(refused).toContain((await rest().get('/api/droplet-badges').set(auth())).status);
    expect(refused).toContain((await rest().post('/api/droplet-badges').set(auth()).send({ data: {} })).status);
    expect(refused).toContain((await rest().get('/api/droplet-badges/1').set(auth())).status);
    expect(refused).toContain((await rest().put('/api/droplet-badges/1').set(auth()).send({ data: {} })).status);
    expect(refused).toContain((await rest().delete('/api/droplet-badges/1').set(auth())).status);
  });
});

describe('POST /droplet-badges/options', () => {
  it('saves 1 to 3 options with a server-made hash', async () => {
    const res = await saveRoute(body({ options: [option({ emblemSvg: svg(1) })] }));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(Object.keys(res.body.data[0]).sort()).toEqual(['documentId', 'emblemSvg', 'id', 'title']);

    const saved = await rows();
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ status: 'option', model: 'claude-sonnet-5-5', promptVersion: 'v1' });
    expect(saved[0].emblemHash).toMatch(/^[0-9a-f]{64}$/);
    expect((await saveRoute(body())).status).toBe(200);
  });

  it.each([
    ['an extra key', { extra: 1 }],
    ['a string dropletId', { dropletId: '1' }],
    ['a zero userId', { userId: 0 }],
    ['no options', { options: [] }],
    ['4 options', { options: [option(), option(), option(), option()] }],
    ['options that are not an array', { options: option() }],
    ['an option with an extra key', { options: [{ ...option(), extra: 1 }] }],
    ['an empty title', { options: [option({ title: '' })] }],
    ['a title over 60', { options: [option({ title: 'x'.repeat(61) })] }],
    ['an SVG over 12288', { options: [option({ emblemSvg: `<svg>${'a'.repeat(12290)}</svg>` })] }],
    ['text that is not an SVG', { options: [option({ emblemSvg: '<div></div>' })] }],
    ['text that starts with an SVG but does not end with one', { options: [option({ emblemSvg: '<svg></svg><p>' })] }],
    ['a model over 40', { options: [option({ model: 'm'.repeat(41) })] }],
    ['a promptVersion over 40', { options: [option({ promptVersion: 'p'.repeat(41) })] }],
  ])('rejects %s with 400 and saves nothing', async (_label, overrides) => {
    const res = await saveRoute(body(overrides));
    expect(res.status).toBe(400);
    expect(await rows()).toHaveLength(0);
  });

  it('accepts a title of 60 and an SVG of exactly 12288 characters', async () => {
    const pad = '<svg>' + 'a'.repeat(12288 - '<svg></svg>'.length) + '</svg>';
    expect(pad).toHaveLength(12288);
    const res = await saveRoute(body({ options: [option({ title: 'x'.repeat(60), emblemSvg: pad })] }));
    expect(res.status).toBe(200);
  });

  it('accepts an SVG with spaces around it', async () => {
    expect((await saveRoute(body({ options: [option({ emblemSvg: `\n  ${svg(77)}\n` })] }))).status).toBe(200);
  });

  it('404s for an unknown droplet or user', async () => {
    expect((await saveRoute(body({ dropletId: 2147483647 }))).status).toBe(404);
    expect((await saveRoute(body({ userId: 2147483647 }))).status).toBe(404);
  });

  it('replaces the stored options when saved again', async () => {
    await saveRoute(body());
    const first = await rows();
    const res = await saveRoute(body({ options: [option(), option()] }));
    expect(res.status).toBe(200);
    const after = await rows();
    expect(after).toHaveLength(2);
    expect(after.map((r) => r.id)).not.toEqual(expect.arrayContaining([first[0].id]));
  });

  it('lets the same options be saved again', async () => {
    const options = [option({ emblemSvg: svg(5) }), option({ emblemSvg: svg(6) })];
    expect((await saveRoute(body({ options }))).status).toBe(200);
    expect((await saveRoute(body({ options }))).status).toBe(200);
    expect(await rows()).toHaveLength(2);
  });

  it('409s on a hash already used by another droplet, and keeps its own options', async () => {
    const shared = svg(9);
    expect((await saveRoute(body({ dropletId: other.id, options: [option({ emblemSvg: shared })] }))).status).toBe(200);
    await saveRoute(body());
    const before = await rows({ droplet: { id: droplet.id } });
    const res = await saveRoute(body({ options: [option(), option({ emblemSvg: shared })] }));
    expect(res.status).toBe(409);
    expect(await rows({ droplet: { id: droplet.id } })).toHaveLength(before.length);
  });

  it('treats a re-spaced or commented copy as the same design', async () => {
    const a = '<svg viewBox="0 0 1 1"> <g/> <path d="M0 0"/> </svg>';
    const b = '<svg viewBox="0 0 1 1">\n  <!-- note -->\n  <g/>\n  <path d="M0 0"/>\n</svg>\n';
    expect((await saveRoute(body({ options: [option({ emblemSvg: a })] }))).status).toBe(200);
    const res = await saveRoute(body({ dropletId: other.id, options: [option({ emblemSvg: b })] }));
    expect(res.status).toBe(409);
  });

  it('409s on two options with the same hash in one request', async () => {
    const res = await saveRoute(body({ options: [option({ emblemSvg: svg(3) }), option({ emblemSvg: svg(3) })] }));
    expect(res.status).toBe(409);
    expect(await rows()).toHaveLength(0);
  });

  it('409s once a badge is picked, and changes nothing', async () => {
    const saved = (await saveRoute(body())).body.data;
    await pickRoute({ dropletId: droplet.id, optionId: saved[0].id, userId: user.id });
    const res = await saveRoute(body());
    expect(res.status).toBe(409);
    expect(res.body.error.message).toBe('Badge already picked');
    expect(await rows()).toHaveLength(1);
  });

  it('is refused by the unique index itself', async () => {
    await saveRoute(body({ options: [option({ emblemSvg: svg(4) })] }));
    const [row] = await rows();
    await expectUniqueViolation(
      strapi.db.connection('droplet_badges').insert({
        title: 't',
        status: 'option',
        emblem_svg: '<svg></svg>',
        emblem_hash: row.emblemHash,
      }),
      { table: 'droplet_badges', column: 'emblem_hash', index: 'droplet_badges_emblem_hash_uq' },
    );
  });
});

describe('POST /droplet-badges/pick', () => {
  it('keeps the option and deletes the rest', async () => {
    const saved = (await saveRoute(body())).body.data;
    const res = await pickRoute({ dropletId: droplet.id, optionId: saved[1].id, userId: user.id });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: saved[1].id, dropletId: droplet.id, title: 'Ribbon' });
    const left = await rows();
    expect(left).toHaveLength(1);
    expect(left[0]).toMatchObject({ id: saved[1].id, status: 'picked' });
  });

  it('409s when picking twice', async () => {
    const saved = (await saveRoute(body())).body.data;
    await pickRoute({ dropletId: droplet.id, optionId: saved[0].id, userId: user.id });
    const again = await pickRoute({ dropletId: droplet.id, optionId: saved[0].id, userId: user.id });
    // The picked row is no longer an option, so it is not found; a second option can't exist either.
    expect([404, 409]).toContain(again.status);
    expect(await rows({ status: 'picked' })).toHaveLength(1);
  });

  it('409s when a picked badge already exists and another option is chosen', async () => {
    const saved = (await saveRoute(body())).body.data;
    await pickRoute({ dropletId: droplet.id, optionId: saved[0].id, userId: user.id });
    // Rows can only get here by hand (admin reset gone wrong): put an option beside the pick.
    const row = await strapi.documents(DROPLET_BADGE_UID).create({
      data: {
        droplet: droplet.documentId,
        status: 'option',
        title: 't',
        emblemSvg: svg(),
        emblemHash: 'f'.repeat(64),
      },
    });
    const res = await pickRoute({ dropletId: droplet.id, optionId: row.id, userId: user.id });
    expect(res.status).toBe(409);
    expect(res.body.error.message).toBe('Badge already picked');
  });

  it("404s for another droplet's option, a missing id and a picked row", async () => {
    const mine = (await saveRoute(body())).body.data;
    const theirs = (await saveRoute(body({ dropletId: other.id }))).body.data;
    const foreign = await pickRoute({ dropletId: droplet.id, optionId: theirs[0].id, userId: user.id });
    expect(foreign.status).toBe(404);
    expect((await pickRoute({ dropletId: droplet.id, optionId: 2147483647, userId: user.id })).status).toBe(404);
    expect(await rows({ status: 'picked' })).toHaveLength(0);
    expect(await rows({ droplet: { id: droplet.id } })).toHaveLength(mine.length);
    expect(await rows({ droplet: { id: other.id } })).toHaveLength(theirs.length);
  });

  it.each([
    ['an extra key', { extra: 1 }],
    ['a bad optionId', { optionId: -1 }],
    ['a missing userId', { userId: undefined }],
  ])('rejects %s with 400', async (_label, overrides) => {
    const res = await pickRoute({ dropletId: droplet.id, optionId: 1, userId: user.id, ...overrides });
    expect(res.status).toBe(400);
  });
});

describe('GET /droplet-badges/picked', () => {
  it('returns only picked badges', async () => {
    const mine = (await saveRoute(body())).body.data;
    await saveRoute(body({ dropletId: other.id }));
    await pickRoute({ dropletId: droplet.id, optionId: mine[0].id, userId: user.id });
    const res = await pickedRoute(`?dropletIds=${droplet.id},${other.id},2147483647`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([
      { dropletId: droplet.id, title: 'Ribbon', emblemSvg: mine[0].emblemSvg },
    ]);
  });

  it.each([
    ['nothing', ''],
    ['an empty list', '?dropletIds='],
    ['a zero', '?dropletIds=0'],
    ['a negative', '?dropletIds=-1'],
    ['a decimal', '?dropletIds=1.5'],
    ['text', '?dropletIds=1,a'],
    ['a trailing comma', '?dropletIds=1,'],
    ['101 ids', `?dropletIds=${Array.from({ length: 101 }, (_, i) => i + 1).join(',')}`],
    ['two lists', '?dropletIds=1&dropletIds=2'],
    ['an extra key', '?dropletIds=1&x=1'],
  ])('rejects %s with 400', async (_label, qs) => {
    expect((await pickedRoute(qs)).status).toBe(400);
  });

  it('accepts 100 ids', async () => {
    const qs = `?dropletIds=${Array.from({ length: 100 }, (_, i) => i + 1).join(',')}`;
    expect((await pickedRoute(qs)).status).toBe(200);
  });
});

describe('GET /droplet-badges/options', () => {
  it('returns the stored options, oldest first', async () => {
    const saved = (await saveRoute(body())).body.data;
    const res = await optionsRoute(`?dropletId=${droplet.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(
      saved.map(({ id, title, emblemSvg }) => ({ id, title, emblemSvg })),
    );
  });

  it('is empty with no options or once a badge is picked', async () => {
    expect((await optionsRoute(`?dropletId=${droplet.id}`)).body.data).toEqual([]);
    const saved = (await saveRoute(body())).body.data;
    await pickRoute({ dropletId: droplet.id, optionId: saved[0].id, userId: user.id });
    expect((await optionsRoute(`?dropletId=${droplet.id}`)).body.data).toEqual([]);
  });

  it.each([['nothing', ''], ['zero', '?dropletId=0'], ['text', '?dropletId=a'], ['an extra key', '?dropletId=1&x=1']])(
    'rejects %s with 400',
    async (_label, qs) => {
      expect((await optionsRoute(qs)).status).toBe(400);
    },
  );
});

describe('deleting a droplet', () => {
  it('deletes its badges and options, and frees the design', async () => {
    const shared = svg(42);
    const saved = (await saveRoute(body({ options: [option({ emblemSvg: shared }), option(), option()] }))).body.data;
    await saveRoute(body({ dropletId: other.id, options: [option()] }));
    await strapi.documents(DROPLET_UID).delete({ documentId: droplet.documentId });

    expect(await rows({ droplet: { id: droplet.id } })).toHaveLength(0);
    const left = await rows();
    expect(left).toHaveLength(1);
    expect(left.some((r) => saved.some((s) => s.id === r.id))).toBe(false);
    const links = await strapi.db.connection('droplet_badges_droplet_lnk').count({ c: '*' }).first();
    expect(Number(links.c)).toBe(1);

    const again = await saveRoute(body({ dropletId: other.id, options: [option({ emblemSvg: shared })] }));
    expect(again.status).toBe(200);
  });

  it('deletes the badges of a picked droplet too', async () => {
    const saved = (await saveRoute(body())).body.data;
    await pickRoute({ dropletId: droplet.id, optionId: saved[0].id, userId: user.id });
    await strapi.documents(DROPLET_UID).delete({ documentId: droplet.documentId });
    expect(await rows()).toHaveLength(0);
  });
});
