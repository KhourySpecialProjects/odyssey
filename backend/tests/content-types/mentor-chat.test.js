const request = require('supertest');
const { setupStrapi, teardownStrapi } = require('../helpers/strapi');
const { createFullAccessToken } = require('../helpers/api-token');
const { MENTOR_CHAT_UID, MENTOR_MESSAGE_UID, USER_UID, userData } = require('../helpers/fixtures');

let strapi;
let token;

const api = (method, path) =>
  request(strapi.server.httpServer)[method](path).set('Authorization', `Bearer ${token}`);

beforeAll(async () => {
  strapi = await setupStrapi();
  token = await createFullAccessToken(strapi);
});

afterAll(async () => {
  await teardownStrapi();
});

describe('mentor-chat and mentor-message (ODY-937)', () => {
  it('saves a chat with its messages and reads them only through the owner route', async () => {
    const user = await strapi.documents(USER_UID).create({ data: userData() });
    const chat = await strapi.documents(MENTOR_CHAT_UID).create({
      data: {
        authorizedUser: user.documentId,
        kind: 'lesson',
        title: 'What is a loop?',
        lastMessageAt: new Date().toISOString(),
      },
    });
    await strapi.documents(MENTOR_MESSAGE_UID).create({
      data: { chat: chat.documentId, role: 'user', text: 'What is a loop?' },
    });
    await strapi.documents(MENTOR_MESSAGE_UID).create({
      data: { chat: chat.documentId, role: 'assistant', text: 'It repeats.', citations: [{ ref: 'p1' }] },
    });

    const res = await api('get', `/api/mentor-chats/owned/${chat.documentId}?userId=${user.id}&messages=true`);
    const stranger = await api('get', `/api/mentor-chats/owned/${chat.documentId}?userId=${user.id + 999}`);

    expect(res.status).toBe(200);
    expect(res.body.data.chat.title).toBe('What is a loop?');
    expect(res.body.data.messages.map((m) => m.text)).toEqual(['What is a loop?', 'It repeats.']);
    expect(stranger.status).toBe(404);
  });

  it('has no core find or findOne route, and hides text and titles from default responses', async () => {
    const user = await strapi.documents(USER_UID).create({ data: userData() });
    const chat = await strapi.documents(MENTOR_CHAT_UID).create({
      data: { authorizedUser: user.documentId, kind: 'lesson', title: 'secret title' },
    });
    const message = await strapi.documents(MENTOR_MESSAGE_UID).create({
      data: { chat: chat.documentId, role: 'user', text: 'secret words' },
    });

    for (const path of [
      '/api/mentor-chats',
      `/api/mentor-chats/${chat.documentId}?populate=messages`,
      '/api/mentor-messages',
      `/api/mentor-messages/${message.documentId}`,
    ]) {
      const res = await api('get', path);
      expect(res.status).toBe(404);
      expect(JSON.stringify(res.body)).not.toMatch(/secret/);
    }

    const sanitized = await strapi.contentAPI.sanitize.output(message, strapi.contentTypes[MENTOR_MESSAGE_UID]);
    const sanitizedChat = await strapi.contentAPI.sanitize.output(chat, strapi.contentTypes[MENTOR_CHAT_UID]);
    expect(sanitized).not.toHaveProperty('text');
    expect(sanitizedChat).not.toHaveProperty('title');
  });

  it('keeps both schema files valid JSON with private fields and a text cap', () => {
    const read = (name) =>
      JSON.parse(
        require('fs').readFileSync(
          require('path').join(__dirname, `../../src/api/${name}/content-types/${name}/schema.json`),
          'utf8',
        ),
      );

    expect(read('mentor-message').attributes.text).toMatchObject({ private: true, maxLength: 20000 });
    expect(read('mentor-chat').attributes.title).toMatchObject({ private: true });
  });

  it('rejects message text over 20000 characters on the exchange route', async () => {
    const res = await api('post', '/api/mentor-chats/owned/abcdefgh12/exchange').send({
      userId: 1,
      question: 'q',
      answer: 'x'.repeat(20001),
    });

    expect(res.status).toBe(400);
  });

  it('rejects a kind outside lesson and explain', async () => {
    const res = await api('post', '/api/mentor-chats/start').send({
      userId: 1,
      dropletId: 1,
      lessonId: 1,
      kind: 'quiz-hint',
      title: 'x',
    });

    expect(res.status).toBe(400);
  });

  it('is not reachable without the service token', async () => {
    const res = await request(strapi.server.httpServer).get('/api/mentor-chats/owned?userId=1');

    expect([401, 403]).toContain(res.status);
  });
});
