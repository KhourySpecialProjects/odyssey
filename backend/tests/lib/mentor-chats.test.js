const { setupStrapi, teardownStrapi } = require('../helpers/strapi');
const {
  MENTOR_CHAT_UID,
  MENTOR_MESSAGE_UID,
  USER_UID,
  DROPLET_UID,
  LESSON_UID,
  userData,
  dropletData,
  lessonData,
} = require('../helpers/fixtures');

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
const allMessages = () => strapi.documents(MENTOR_MESSAGE_UID).count({});
const messageCount = (chat) =>
  strapi.documents(MENTOR_MESSAGE_UID).count({ filters: { chat: { documentId: chat.documentId } } });

describe('purgeExpiredChats (30-day retention)', () => {
  it('removes an old chat and its messages and keeps a recent one', async () => {
    const user = await strapi.documents(USER_UID).create({ data: userData() });
    const old = await chatWithMessages(user, daysAgo(31));
    const recent = await chatWithMessages(user, daysAgo(2));
    const before = await allMessages();

    const result = await lib.purgeExpiredChats();

    expect(result.chats).toBeGreaterThanOrEqual(1);
    expect(await exists(MENTOR_CHAT_UID, old.documentId)).toBe(false);
    expect(await messageCount(old)).toBe(0);
    expect(await allMessages()).toBe(before - 2);
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

  it('removes a brand-new message left without a chat', async () => {
    const orphan = await strapi.documents(MENTOR_MESSAGE_UID).create({ data: { role: 'user', text: 'lost' } });

    await lib.purgeExpiredChats();

    expect(await exists(MENTOR_MESSAGE_UID, orphan.documentId)).toBe(false);
  });
});

describe('ownership and saves', () => {
  it('treats a chat past 30 days, or of another kind, as not found', async () => {
    const user = await strapi.documents(USER_UID).create({ data: userData() });
    const old = await chatWithMessages(user, daysAgo(31));
    const fresh = await chatWithMessages(user, daysAgo(1));

    expect(await lib.ownedChatRow(user.id, old.documentId)).toBeNull();
    expect(await lib.ownedChatRow(user.id, fresh.documentId)).not.toBeNull();
    expect(await lib.ownedChatRow(user.id, fresh.documentId, { kind: 'explain' })).toBeNull();
    expect(await lib.ownedChatRow(user.id + 999, fresh.documentId)).toBeNull();
  });

  it('returns the start lesson and droplet as { id, name } only when asked', async () => {
    const user = await strapi.documents(USER_UID).create({ data: userData() });
    const droplet = await strapi.documents(DROPLET_UID).create({ data: dropletData() });
    const lesson = await strapi.documents(LESSON_UID).create({ data: lessonData() });
    const chat = await strapi.documents(MENTOR_CHAT_UID).create({
      data: {
        authorizedUser: user.documentId,
        droplet: droplet.documentId,
        lesson: lesson.documentId,
        kind: 'lesson',
        title: 'q',
        lastMessageAt: daysAgo(1),
      },
    });

    const row = await lib.ownedChatRow(user.id, chat.documentId, { withStart: true });
    expect(row.lesson).toMatchObject({ id: lesson.id, name: expect.any(String) });
    expect(row.droplet).toMatchObject({ id: droplet.id, name: expect.any(String) });
    expect((await lib.ownedChatRow(user.id, chat.documentId)).lesson).toBeUndefined();
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
    const before = await allMessages();

    expect((await lib.chatMessages(chat.documentId)).length).toBe(105);
    await lib.deleteChat(chat.documentId);

    expect(await allMessages()).toBe(before - 105);
    expect(await messageCount(chat)).toBe(0);
    expect(await exists(MENTOR_CHAT_UID, chat.documentId)).toBe(false);
  });
});

describe('deleting', () => {
  it('removes a message a racing save left without a chat, in deleteChat and in delete-all', async () => {
    const user = await strapi.documents(USER_UID).create({ data: userData() });
    const chat = await chatWithMessages(user, daysAgo(1), 2);
    const orphan = await strapi.documents(MENTOR_MESSAGE_UID).create({ data: { role: 'user', text: 'raced' } });
    await lib.deleteChat(chat.documentId);
    expect(await exists(MENTOR_MESSAGE_UID, orphan.documentId)).toBe(false);

    await chatWithMessages(user, daysAgo(1), 2);
    const orphan2 = await strapi.documents(MENTOR_MESSAGE_UID).create({ data: { role: 'user', text: 'raced' } });
    const before = await allMessages();
    expect(await lib.deleteChatsOf(user.id)).toBe(1);
    expect(await exists(MENTOR_MESSAGE_UID, orphan2.documentId)).toBe(false);
    expect(await allMessages()).toBe(before - 3);
  });

  it('deletes more than one batch of chats for a user, with all their messages', async () => {
    const user = await strapi.documents(USER_UID).create({ data: userData() });
    const other = await strapi.documents(USER_UID).create({ data: userData() });
    const kept = await chatWithMessages(other, daysAgo(1), 2);
    for (let i = 0; i < 101; i++) await chatWithMessages(user, daysAgo(1), 1);
    const before = await allMessages();

    expect(await lib.deleteChatsOf(user.id)).toBe(101);

    expect(await allMessages()).toBe(before - 101);
    expect(await messageCount(kept)).toBe(2);
  });
});

describe('listChats search (q)', () => {
  const started = async (user, droplet, lesson, title, lastMessageAt = daysAgo(1)) =>
    strapi.documents(MENTOR_CHAT_UID).create({
      data: {
        authorizedUser: user.documentId,
        droplet: droplet.documentId,
        lesson: lesson.documentId,
        kind: 'lesson',
        title,
        lastMessageAt,
      },
    });
  const ids = (rows) => rows.map((r) => r.documentId).sort();

  it('matches the title, the droplet name or the lesson name, ignoring case', async () => {
    const user = await strapi.documents(USER_UID).create({ data: userData() });
    const plain = await strapi.documents(DROPLET_UID).create({ data: dropletData() });
    const plainLesson = await strapi.documents(LESSON_UID).create({ data: lessonData() });
    const named = await strapi.documents(DROPLET_UID).create({ data: dropletData({ name: 'Zebra Droplet' }) });
    const namedLesson = await strapi.documents(LESSON_UID).create({ data: lessonData({ name: 'Walrus Lesson' }) });
    const byTitle = await started(user, plain, plainLesson, 'Why is the Quokka happy?');
    const byDroplet = await started(user, named, plainLesson, 'other');
    const byLesson = await started(user, plain, namedLesson, 'another');

    expect(ids(await lib.listChats(user.id, { q: 'QUOKKA' }))).toEqual([byTitle.documentId]);
    expect(ids(await lib.listChats(user.id, { q: 'zebra' }))).toEqual([byDroplet.documentId]);
    expect(ids(await lib.listChats(user.id, { q: 'walrus' }))).toEqual([byLesson.documentId]);
    expect(await lib.listChats(user.id, { q: 'no such thing' })).toEqual([]);
  });

  it('never returns another user\'s chat or one past 30 days', async () => {
    const mine = await strapi.documents(USER_UID).create({ data: userData() });
    const theirs = await strapi.documents(USER_UID).create({ data: userData() });
    const droplet = await strapi.documents(DROPLET_UID).create({ data: dropletData() });
    const lesson = await strapi.documents(LESSON_UID).create({ data: lessonData() });
    await started(theirs, droplet, lesson, 'Giraffe secrets');
    await started(mine, droplet, lesson, 'Giraffe old', daysAgo(31));
    const live = await started(mine, droplet, lesson, 'Giraffe new');

    expect(ids(await lib.listChats(mine.id, { q: 'giraffe' }))).toEqual([live.documentId]);
  });

  it('treats % and _ literally', async () => {
    const user = await strapi.documents(USER_UID).create({ data: userData() });
    const droplet = await strapi.documents(DROPLET_UID).create({ data: dropletData() });
    const lesson = await strapi.documents(LESSON_UID).create({ data: lessonData() });
    const percent = await started(user, droplet, lesson, '100% sure');
    await started(user, droplet, lesson, '100 sure');
    const underscore = await started(user, droplet, lesson, 'snake_case');
    await started(user, droplet, lesson, 'snakeXcase');

    expect(ids(await lib.listChats(user.id, { q: '%' }))).toEqual([percent.documentId]);
    expect(ids(await lib.listChats(user.id, { q: 'snake_case' }))).toEqual([underscore.documentId]);
  });
});
