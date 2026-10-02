const request = require('supertest');
const { setupStrapi, teardownStrapi } = require('../helpers/strapi');
const { createFullAccessToken } = require('../helpers/api-token');
const { useSlackSpy } = require('../helpers/slack');
const { CREATION_REQUEST_UID, USER_UID, userData } = require('../helpers/fixtures');

let strapi;
let token;
const slack = useSlackSpy();

const rest = () => request(strapi.server.httpServer);
const auth = () => ({ Authorization: `Bearer ${token}` });
const createUser = (overrides) =>
  strapi.documents(USER_UID).create({ data: userData(overrides) });

beforeAll(async () => {
  strapi = await setupStrapi();
  token = await createFullAccessToken(strapi);
});

afterAll(async () => {
  await teardownStrapi();
});

describe('creation-request afterCreate', () => {
  it('sends exactly one message naming the user (documents API)', async () => {
    const user = await createUser({ firstName: 'Katherine', lastName: 'Johnson' });
    slack.reset();

    await strapi.documents(CREATION_REQUEST_UID).create({
      data: { motivation: 'I like teaching', dropletIdea: 'Orbits', user: user.documentId },
    });

    const sends = slack.sends();
    expect(sends).toHaveLength(1);
    expect(sends[0].text).toContain('Katherine Johnson');
    const blocks = JSON.stringify(sends[0].blocks);
    expect(blocks).toContain(user.email);
    expect(blocks).toContain('I like teaching');
    expect(blocks).toContain('Orbits');
  });

  it('sends exactly one message naming the user (REST POST)', async () => {
    const user = await createUser({ firstName: 'Mary', lastName: 'Jackson' });
    slack.reset();

    const res = await rest()
      .post('/api/creation-requests')
      .set(auth())
      .send({ data: { motivation: 'Mentoring', user: user.documentId } });

    expect(res.status).toBe(201);
    const sends = slack.sends();
    expect(sends).toHaveLength(1);
    expect(sends[0].text).toContain('Mary Jackson');
  });

  it('falls back to the email when the user has no name', async () => {
    const user = await createUser({ firstName: null, lastName: null });
    slack.reset();

    await strapi
      .documents(CREATION_REQUEST_UID)
      .create({ data: { user: user.documentId } });

    const sends = slack.sends();
    expect(sends).toHaveLength(1);
    expect(sends[0].text).toContain(user.email);
  });

  it('sends nothing on update or delete', async () => {
    const user = await createUser();
    const created = await strapi
      .documents(CREATION_REQUEST_UID)
      .create({ data: { user: user.documentId } });
    slack.reset();

    await strapi
      .documents(CREATION_REQUEST_UID)
      .update({ documentId: created.documentId, data: { motivation: 'Updated' } });
    await strapi
      .documents(CREATION_REQUEST_UID)
      .delete({ documentId: created.documentId });

    expect(slack.sends()).toHaveLength(0);
  });
});
