const { setupStrapi, teardownStrapi } = require('../helpers/strapi');
const { MENTOR_CHAT_UID, MENTOR_MESSAGE_UID, USER_UID, userData } = require('../helpers/fixtures');

let strapi;
let lib;

beforeAll(async () => {
  strapi = await setupStrapi();
  lib = require('../../dist/src/lib/mentor-chats');
});

afterAll(async () => {
  await teardownStrapi();
});

const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();

async function chatWithMessages(user, lastMessageAt, count = 2) {
  const chat = await strapi.documents(MENTOR_CHAT_UID).create({
    data: { authorizedUser: user.documentId, kind: 'lesson', title: 'q', lastMessageAt },
  });
  for (let i = 0; i < count; i++) {
    await strapi.documents(MENTOR_MESSAGE_UID).create({
      data: { chat: chat.documentId, role: i % 2 ? 'assistant' : 'user', text: `m${i}` },
    });
  }
  return chat;
}

const exists = async (uid, documentId) =>
  !!(await strapi.documents(uid).findFirst({ filters: { documentId }, fields: ['id'] }));
const messageCount = (chat) =>
  strapi.documents(MENTOR_MESSAGE_UID).count({ filters: { chat: { documentId: chat.documentId } } });

describe('purgeExpiredChats (30-day retention)', () => {
  it('removes an old chat and its messages and keeps a recent one', async () => {
    const user = await strapi.documents(USER_UID).create({ data: userData() });
    const old = await chatWithMessages(user, daysAgo(31));
    const recent = await chatWithMessages(user, daysAgo(2));

    const result = await lib.purgeExpiredChats();

    expect(result.chats).toBeGreaterThanOrEqual(1);
    expect(await exists(MENTOR_CHAT_UID, old.documentId)).toBe(false);
    expect(await messageCount(old)).toBe(0);
    expect(await exists(MENTOR_CHAT_UID, recent.documentId)).toBe(true);
    expect(await messageCount(recent)).toBe(2);
  });

  it('uses createdAt for a chat that never got a message', async () => {
    const user = await strapi.documents(USER_UID).create({ data: userData() });
    const empty = await chatWithMessages(user, null, 0);
    const later = new Date(Date.now() + 31 * 86400000);

    await lib.purgeExpiredChats(later);

    expect(await exists(MENTOR_CHAT_UID, empty.documentId)).toBe(false);
  });

  it('removes messages left without a chat', async () => {
    const orphan = await strapi.documents(MENTOR_MESSAGE_UID).create({ data: { role: 'user', text: 'lost' } });
    const later = new Date(Date.now() + 31 * 86400000);

    await lib.purgeExpiredChats(later);

    expect(await exists(MENTOR_MESSAGE_UID, orphan.documentId)).toBe(false);
  });
});

describe('ownership and saves', () => {
  it('treats a chat past 30 days, or from another lesson or kind, as not found', async () => {
    const user = await strapi.documents(USER_UID).create({ data: userData() });
    const old = await chatWithMessages(user, daysAgo(31));
    const fresh = await chatWithMessages(user, daysAgo(1));

    expect(await lib.ownedChatRow(user.id, old.documentId)).toBeNull();
    expect(await lib.ownedChatRow(user.id, fresh.documentId)).not.toBeNull();
    expect(await lib.ownedChatRow(user.id, fresh.documentId, { kind: 'explain' })).toBeNull();
    expect(await lib.ownedChatRow(user.id, fresh.documentId, { lessonId: 987654 })).toBeNull();
    expect(await lib.ownedChatRow(user.id + 999, fresh.documentId)).toBeNull();
  });

  it('refuses to save into a deleted chat and leaves no message behind', async () => {
    const user = await strapi.documents(USER_UID).create({ data: userData() });
    const chat = await chatWithMessages(user, daysAgo(1), 0);
    await lib.deleteChat(chat.documentId);

    await expect(
      lib.saveExchange({ userId: user.id, chatDocumentId: chat.documentId, question: 'q', answer: 'a', citations: [] }),
    ).rejects.toMatchObject({ status: 404 });
    expect(await messageCount(chat)).toBe(0);
  });

  it('deletes a chat with more than one page of messages, all of them', async () => {
    const user = await strapi.documents(USER_UID).create({ data: userData() });
    const chat = await chatWithMessages(user, daysAgo(1), 105);

    expect((await lib.chatMessages(chat.documentId)).length).toBe(105);
    await lib.deleteChat(chat.documentId);

    expect(await messageCount(chat)).toBe(0);
    expect(await exists(MENTOR_CHAT_UID, chat.documentId)).toBe(false);
  });
});
