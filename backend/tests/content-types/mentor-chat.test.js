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

  const ROUTES = [
    ['post', '/api/mentor-chats/start'],
    ['get', '/api/mentor-chats/owned?userId=1'],
    ['delete', '/api/mentor-chats/owned?userId=1'],
    ['get', '/api/mentor-chats/owned/abcdefgh12?userId=1'],
    ['post', '/api/mentor-chats/owned/abcdefgh12/exchange'],
    ['delete', '/api/mentor-chats/owned/abcdefgh12?userId=1'],
  ];

  it.each(ROUTES)('%s %s is not reachable without a token', async (method, path) => {
    const res = await request(strapi.server.httpServer)[method](path);

    expect([401, 403]).toContain(res.status);
  });

  it('refuses a registered user JWT on all six routes even when the role is granted the actions', async () => {
    const roleService = strapi.plugin('users-permissions').service('role');
    const { id } = await strapi.db.query('plugin::users-permissions.role').findOne({ where: { type: 'authenticated' } });
    const role = await roleService.findOne(id);
    const actions = ['start', 'list', 'removeAll', 'findOwned', 'exchange', 'remove'];
    const [apiName, controller] = ['api::mentor-chat', 'custom-mentor-chat'];
    await roleService.updateRole(id, {
      permissions: {
        ...role.permissions,
        [apiName]: { controllers: { ...(role.permissions[apiName]?.controllers ?? {}), [controller]: Object.fromEntries(actions.map((a) => [a, { enabled: true }])) } },
      },
    });
    const registered = await request(strapi.server.httpServer)
      .post('/api/auth/local/register')
      .send({ username: `u${Date.now()}`, email: `u${Date.now()}@example.test`, password: 'Passw0rd!long' });
    expect(registered.body.jwt).toBeTruthy();
    const granted = await strapi.db
      .query('plugin::users-permissions.permission')
      .count({ where: { role: id, action: { $startsWith: 'api::mentor-chat.custom-mentor-chat.' } } });
    expect(granted).toBe(6);

    for (const [method, path] of ROUTES) {
      const res = await request(strapi.server.httpServer)
        [method](path)
        .set('Authorization', `Bearer ${registered.body.jwt}`)
        .send({});
      expect(res.status).toBe(403);
    }
  });

  it('still works with the server API token', async () => {
    const res = await api('get', '/api/mentor-chats/owned?userId=1');

    expect(res.status).toBe(200);
  });
});

describe('owner list search (X-Mentor-Search header)', () => {
  const search = (q) => api('get', '/api/mentor-chats/owned?userId=1').set('X-Mentor-Search', q);

  it.each([
    ['blank', '%20%20'],
    ['over 100 characters', 'a'.repeat(101)],
    ['badly encoded', '%E0%A4%A'],
    ['repeated', 'a, b'],
  ])('rejects a %s term with 400', async (_name, q) => {
    expect((await search(q)).status).toBe(400);
  });

  it('rejects q in the query string, and accepts a trimmed term', async () => {
    expect((await api('get', '/api/mentor-chats/owned?userId=1&q=a')).status).toBe(400);
    const ok = await search('%20loop%20');
    expect(ok.status).toBe(200);
    expect(ok.body.data.length).toBeGreaterThan(0);
    expect(ok.body.data.every((c) => /loop/i.test(c.title))).toBe(true);
  });
});
