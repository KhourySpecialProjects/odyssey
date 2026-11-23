// Saved Mentor chats (ODY-937). Text and titles are private fields, so they are
// read only through these functions. Chats live 30 days; this file owns that rule.
export const MENTOR_CHAT_UID = 'api::mentor-chat.mentor-chat';
export const MENTOR_MESSAGE_UID = 'api::mentor-message.mentor-message';
const USER_UID = 'api::authorized-user.authorized-user';
const DROPLET_UID = 'api::droplet.droplet';
const LESSON_UID = 'api::lesson.lesson';

export const MENTOR_CHAT_RETENTION_DAYS = 30;
export const MENTOR_TITLE_MAX = 80;
export const MENTOR_TEXT_MAX = 20000;
export const MENTOR_CHAT_KINDS = ['lesson', 'explain'] as const;
export type MentorChatKind = (typeof MENTOR_CHAT_KINDS)[number];

const BATCH = 100;
const DAY_MS = 24 * 60 * 60 * 1000;

type Row = Record<string, any>;

export class MentorChatError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'MentorChatError';
  }
}

export const retentionCutoff = (now = new Date()) =>
  new Date(now.getTime() - MENTOR_CHAT_RETENTION_DAYS * DAY_MS).toISOString();

/** Chats whose last message (or creation, if none) is past the cutoff */
const expiredFilter = (cutoff: string) => ({
  $or: [
    { lastMessageAt: { $lt: cutoff } },
    { lastMessageAt: { $null: true }, createdAt: { $lt: cutoff } },
  ],
});

/** Chats still inside the 30 days */
const liveFilter = (cutoff: string) => ({
  $or: [
    { lastMessageAt: { $gte: cutoff } },
    { lastMessageAt: { $null: true }, createdAt: { $gte: cutoff } },
  ],
});

const chats = () => strapi.documents(MENTOR_CHAT_UID as any);
const messages = () => strapi.documents(MENTOR_MESSAGE_UID as any);

const findId = (uid: string, id: number) =>
  strapi.documents(uid as any).findFirst({ filters: { id }, fields: ['id'] } as any) as Promise<Row | null>;

/** Pages through every match, so no list is cut short */
async function findAll(
  documents: ReturnType<typeof chats>,
  params: Record<string, any>,
): Promise<Row[]> {
  const all: Row[] = [];
  for (let start = 0; ; start += BATCH) {
    const page = (await documents.findMany({ ...params, start, limit: BATCH } as any)) as Row[];
    all.push(...page);
    if (page.length < BATCH) return all;
  }
}

/** The chat if `userId` owns it, is under 30 days old and matches kind, with the lesson and droplet it started in */
export async function ownedChatRow(
  userId: number,
  documentId: string,
  match: { kind?: MentorChatKind; withStart?: boolean } = {},
  now = new Date(),
): Promise<Row | null> {
  return (await chats().findFirst({
    filters: {
      $and: [
        { documentId, authorizedUser: { id: userId } },
        liveFilter(retentionCutoff(now)),
        ...(match.kind !== undefined ? [{ kind: match.kind }] : []),
      ],
    },
    fields: ['documentId', 'kind', 'title', 'lastMessageAt'],
    // Start relations only when asked: saves never use them
    ...(match.withStart && { populate: { droplet: { fields: ['name'] }, lesson: { fields: ['name'] } } }),
  } as any)) as Row | null;
}

export async function startChat(input: {
  userId: number;
  dropletId: number;
  lessonId: number;
  kind: MentorChatKind;
  title: string;
}): Promise<{ documentId: string }> {
  const [user, droplet, lesson] = await Promise.all([
    findId(USER_UID, input.userId),
    findId(DROPLET_UID, input.dropletId),
    findId(LESSON_UID, input.lessonId),
  ]);
  if (!user || !droplet || !lesson) throw new MentorChatError(404, 'User, droplet or lesson not found');
  const created = (await chats().create({
    data: {
      authorizedUser: user.documentId,
      droplet: droplet.documentId,
      lesson: lesson.documentId,
      kind: input.kind,
      title: input.title.trim().slice(0, MENTOR_TITLE_MAX),
    },
  } as any)) as Row;
  return { documentId: created.documentId };
}

/** Matches the chat title or the start droplet or lesson name; `q` is trimmed and checked by the route */
const searchFilter = (q: string) => ({
  $or: [{ title: { $containsi: q } }, { droplet: { name: { $containsi: q } } }, { lesson: { name: { $containsi: q } } }],
});

export async function listChats(
  userId: number,
  options: { lessonId?: number; q?: string } = {},
  now = new Date(),
): Promise<Row[]> {
  const { lessonId, q } = options;
  return findAll(chats(), {
    filters: {
      $and: [
        { authorizedUser: { id: userId }, lastMessageAt: { $notNull: true } },
        liveFilter(retentionCutoff(now)),
        ...(lessonId !== undefined ? [{ lesson: { id: lessonId } }] : []),
        ...(q ? [searchFilter(q)] : []),
      ],
    },
    fields: ['documentId', 'kind', 'title', 'lastMessageAt'],
    populate: { droplet: { fields: ['name', 'slug'] }, lesson: { fields: ['name', 'slug'] } },
    sort: ['lastMessageAt:desc', 'id:desc'],
  });
}

export async function chatMessages(chatDocumentId: string): Promise<Row[]> {
  return findAll(messages(), {
    filters: { chat: { documentId: chatDocumentId } },
    fields: ['documentId', 'role', 'text', 'citations'],
    sort: ['createdAt:asc', 'id:asc'],
  });
}

/** Writes a question and its answer, only while the chat still exists and is owned */
export async function saveExchange(input: {
  userId: number;
  chatDocumentId: string;
  question: string;
  answer: string;
  citations: unknown;
}): Promise<void> {
  if (!(await ownedChatRow(input.userId, input.chatDocumentId))) {
    throw new MentorChatError(404, 'Chat not found');
  }
  const chat = input.chatDocumentId;
  const made: string[] = [];
  try {
    // In order, so the question sorts before its answer
    for (const data of [
      { chat, role: 'user', text: input.question },
      { chat, role: 'assistant', text: input.answer, citations: input.citations ?? null },
    ]) {
      const row = (await messages().create({ data } as any)) as Row;
      made.push(row.documentId);
    }
    // A delete that landed mid-save leaves nothing behind
    if (!(await chats().findFirst({ filters: { documentId: chat }, fields: ['id'] } as any))) {
      throw new MentorChatError(404, 'Chat not found');
    }
    await chats().update({ documentId: chat, data: { lastMessageAt: new Date().toISOString() } } as any);
  } catch (error) {
    for (const documentId of made) {
      await messages().delete({ documentId } as any).catch(() => undefined);
    }
    throw error;
  }
}

/** Deletes messages matching `where` in batches until none are left; stops if a batch removes nothing */
async function deleteMessagesWhere(where: Record<string, any>): Promise<void> {
  for (;;) {
    const batch = (await strapi.db
      .query(MENTOR_MESSAGE_UID)
      .findMany({ where, select: ['id'], limit: BATCH })) as Row[];
    if (!batch.length) return;
    const { count } = await strapi.db
      .query(MENTOR_MESSAGE_UID)
      .deleteMany({ where: { id: { $in: batch.map((row) => row.id) } } });
    if (!count) return;
  }
}

/** Messages are always created with their chat, so one without a chat is never legitimate */
const deleteOrphanMessages = () => deleteMessagesWhere({ chat: { id: { $null: true } } });

/** Deletes a chat's messages, then the chat, then any message a racing save left behind */
export async function deleteChat(chatDocumentId: string): Promise<void> {
  await deleteMessagesWhere({ chat: { documentId: chatDocumentId } });
  await strapi.db.query(MENTOR_CHAT_UID).deleteMany({ where: { documentId: chatDocumentId } });
  await deleteOrphanMessages();
}

/** Deletes every chat matching `where` with its messages, in batches. Returns how many. */
async function deleteChatsWhere(where: Record<string, any>): Promise<number> {
  let deleted = 0;
  for (;;) {
    const batch = (await strapi.db.query(MENTOR_CHAT_UID).findMany({ where, select: ['id'], limit: BATCH })) as Row[];
    if (!batch.length) break;
    const ids = batch.map((row) => row.id);
    await deleteMessagesWhere({ chat: { id: { $in: ids } } });
    const { count } = await strapi.db.query(MENTOR_CHAT_UID).deleteMany({ where: { id: { $in: ids } } });
    if (!count) break;
    deleted += count;
  }
  await deleteOrphanMessages();
  return deleted;
}

export const deleteChatsOf = (userId: number) => deleteChatsWhere({ authorizedUser: { id: userId } });

/** The daily cleanup: expired chats with their messages, then messages left without a chat */
export async function purgeExpiredChats(now = new Date()): Promise<{ chats: number }> {
  const cutoff = retentionCutoff(now);
  const count = await deleteChatsWhere(expiredFilter(cutoff));
  return { chats: count };
}
