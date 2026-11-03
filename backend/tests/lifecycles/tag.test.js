const request = require('supertest');
const { setupStrapi, teardownStrapi } = require('../helpers/strapi');
const { createFullAccessToken } = require('../helpers/api-token');
const { unique } = require('../helpers/fixtures');

let strapi;
let token;

// What createNewTag sends: the name and a placeholder slug, which v5 needs
// before beforeCreate runs. slugify never makes a "~", so it can't clash.
const createTag = (name) =>
  request(strapi.server.httpServer)
    .post('/api/tags')
    .set('Authorization', `Bearer ${token}`)
    .send({ data: { name, slug: 'pending~slug' } });

beforeAll(async () => {
  strapi = await setupStrapi();
  token = await createFullAccessToken(strapi);
});

afterAll(async () => {
  await teardownStrapi();
});

describe('tag beforeCreate (ODY-869)', () => {
  it('makes a valid slug from a name with parentheses', async () => {
    const res = await createTag(unique('Command Line Interface (CLI)'));
    expect(res.status).toBe(201);
    expect(res.body.data.slug).toMatch(/^command-line-interface-cli-/);
  });

  it('appends -1 when another name gives the same slug', async () => {
    const base = unique('C++ basics');
    const first = await createTag(base);
    const second = await createTag(base.replace('C++', 'C'));
    expect(second.status).toBe(201);
    expect(second.body.data.slug).toBe(`${first.body.data.slug}-1`);
  });

  it('still rejects a name that is taken', async () => {
    const name = unique('GitHub');
    await createTag(name);
    const res = await createTag(name);
    expect(res.status).toBe(400);
    expect(res.body.error.details.errors[0]).toMatchObject({
      path: ['name'],
      message: 'This attribute must be unique',
    });
  });
});
