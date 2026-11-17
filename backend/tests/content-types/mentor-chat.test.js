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
  it('saves a chat with its messages and reads them back through the chat', async () => {
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

    const res = await api('get', `/api/mentor-chats/${chat.documentId}?populate=messages`);

    expect(res.status).toBe(200);
    expect(res.body.data.messages).toHaveLength(2);
  });

  it('rejects a kind outside lesson and explain, and a title over 80 characters', async () => {
    const quizHint = await api('post', '/api/mentor-chats').send({ data: { kind: 'quiz-hint' } });
    const longTitle = await api('post', '/api/mentor-chats').send({
      data: { kind: 'lesson', title: 'x'.repeat(81) },
    });

    expect(quizHint.status).toBe(400);
    expect(longTitle.status).toBe(400);
  });

  it('is not reachable without the service token', async () => {
    const res = await request(strapi.server.httpServer).get('/api/mentor-chats');

    expect([401, 403]).toContain(res.status);
  });
});
