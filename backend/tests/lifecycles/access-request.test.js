const request = require('supertest');
const { setupStrapi, teardownStrapi } = require('../helpers/strapi');
const { createFullAccessToken } = require('../helpers/api-token');
const { useSlackSpy } = require('../helpers/slack');
const { ACCESS_REQUEST_UID, accessRequestData } = require('../helpers/fixtures');

let strapi;
let token;
const slack = useSlackSpy();

const rest = () => request(strapi.server.httpServer);
const auth = () => ({ Authorization: `Bearer ${token}` });

beforeAll(async () => {
  strapi = await setupStrapi();
  token = await createFullAccessToken(strapi);
});

afterAll(async () => {
  await teardownStrapi();
});

describe('access-request afterCreate', () => {
  it('sends exactly one message with the requester name and email (documents API)', async () => {
    const data = accessRequestData({ givenName: 'Alan', familyName: 'Turing' });

    await strapi.documents(ACCESS_REQUEST_UID).create({ data });

    const sends = slack.sends();
    expect(sends).toHaveLength(1);
    expect(sends[0].text).toContain('Alan Turing');
    expect(sends[0].text).toContain(data.email);
  });

  it('sends exactly one message with the requester name and email (REST POST)', async () => {
    const data = accessRequestData({ givenName: 'Edsger', familyName: 'Dijkstra' });

    const res = await rest().post('/api/access-requests').set(auth()).send({ data });

    expect(res.status).toBe(201);
    const sends = slack.sends();
    expect(sends).toHaveLength(1);
    expect(sends[0].text).toContain('Edsger Dijkstra');
    expect(sends[0].text).toContain(data.email);
  });

  it('sends nothing on update or delete', async () => {
    const created = await strapi
      .documents(ACCESS_REQUEST_UID)
      .create({ data: accessRequestData() });
    slack.reset();

    await strapi
      .documents(ACCESS_REQUEST_UID)
      .update({ documentId: created.documentId, data: { college: 'COE' } });
    await strapi
      .documents(ACCESS_REQUEST_UID)
      .delete({ documentId: created.documentId });

    expect(slack.sends()).toHaveLength(0);
  });
});
