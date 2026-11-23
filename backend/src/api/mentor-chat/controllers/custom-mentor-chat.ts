import {
  MENTOR_CHAT_KINDS,
  MENTOR_TEXT_MAX,
  MentorChatError,
  chatMessages,
  deleteChat,
  deleteChatsOf,
  listChats,
  ownedChatRow,
  saveExchange,
  startChat,
  type MentorChatKind,
} from '../../../lib/mentor-chats';
import { fail, isRowId, isText, parseBody } from '../../../lib/route-body';

const DOCUMENT_ID = /^[A-Za-z0-9]{8,40}$/;
const MAX_CITATIONS = 50;
const MENTOR_SEARCH_MAX = 100;
const SEARCH_HEADER = 'x-mentor-search';

const asInt = (value: unknown) => (typeof value === 'string' && /^\d{1,10}$/.test(value) ? Number(value) : undefined);

/**
 * The search term travels in a header, not the query string, so the request
 * logger never prints what the student typed. URL-encoded, one value, 1-100 characters.
 */
function readSearch(raw: string): string | null {
  if (raw.includes(',')) return null;
  try {
    const q = decodeURIComponent(raw).trim();
    // Control characters (a NUL is a Postgres error) are never a search
    if (/[\u0000-\u001f\u007f]/.test(q)) return null;
    return q.length >= 1 && q.length <= MENTOR_SEARCH_MAX ? q : null;
  } catch {
    return null;
  }
}

/** Reads userId (and the optional lessonId and kind) from a query string; an error message otherwise */
function readQuery(query: Record<string, unknown>, search?: string) {
  const allowed = ['userId', 'lessonId', 'kind', 'messages'];
  const extra = Object.keys(query).find((key) => !allowed.includes(key));
  if (extra) return { error: `Invalid key ${extra}` };
  const userId = asInt(query.userId);
  if (!isRowId(userId)) return { error: 'userId must be a positive integer' };
  const lessonId = query.lessonId === undefined ? undefined : asInt(query.lessonId);
  if (query.lessonId !== undefined && !isRowId(lessonId)) return { error: 'lessonId must be a positive integer' };
  const kind = query.kind as MentorChatKind | undefined;
  if (kind !== undefined && !MENTOR_CHAT_KINDS.includes(kind)) return { error: 'kind must be lesson or explain' };
  const q = search === undefined ? undefined : readSearch(search);
  if (q === null) return { error: `search must be 1 to ${MENTOR_SEARCH_MAX} characters` };
  return { userId: userId as number, lessonId, kind, q, withMessages: query.messages === 'true' };
}

function handle(ctx: any, error: unknown, what: string) {
  if (error instanceof MentorChatError) return fail(ctx, error.status, error.message);
  const { name, message } = error as Error;
  strapi.log.error(`Failed to ${what}: ${name}: ${message}`);
  return fail(ctx, 500, `Failed to ${what}.`);
}

const validId = (ctx: any) => DOCUMENT_ID.test(ctx.params.documentId ?? '');

export default {
  async start(ctx) {
    const parsed = parseBody(ctx.request.body ?? {}, ['userId', 'dropletId', 'lessonId', 'kind', 'title'], [
      'userId',
      'dropletId',
      'lessonId',
    ]);
    if ('invalid' in parsed) return fail(ctx, 400, parsed.invalid);
    const { body } = parsed;
    if (!MENTOR_CHAT_KINDS.includes(body.kind as MentorChatKind)) return fail(ctx, 400, 'kind must be lesson or explain');
    if (!isText(body.title, MENTOR_TEXT_MAX)) return fail(ctx, 400, 'title must be text');
    try {
      ctx.body = { data: await startChat(body as any) };
    } catch (error) {
      handle(ctx, error, 'start the chat');
    }
  },

  async list(ctx) {
    const q = readQuery(ctx.query ?? {}, ctx.get(SEARCH_HEADER) || undefined);
    if ('error' in q) return fail(ctx, 400, q.error as string);
    try {
      ctx.body = { data: await listChats(q.userId, { lessonId: q.lessonId, q: q.q }) };
    } catch (error) {
      handle(ctx, error, 'list chats');
    }
  },

  async findOwned(ctx) {
    const q = readQuery(ctx.query ?? {});
    if ('error' in q) return fail(ctx, 400, q.error as string);
    if (!validId(ctx)) return fail(ctx, 404, 'Chat not found');
    try {
      const chat = await ownedChatRow(q.userId, ctx.params.documentId, { kind: q.kind, withStart: true });
      if (!chat) return fail(ctx, 404, 'Chat not found');
      ctx.body = { data: { chat, ...(q.withMessages && { messages: await chatMessages(chat.documentId) }) } };
    } catch (error) {
      handle(ctx, error, 'read the chat');
    }
  },

  async exchange(ctx) {
    const parsed = parseBody(ctx.request.body ?? {}, ['userId', 'question', 'answer', 'citations'], ['userId']);
    if ('invalid' in parsed) return fail(ctx, 400, parsed.invalid);
    const { body } = parsed;
    if (!validId(ctx)) return fail(ctx, 404, 'Chat not found');
    if (!isText(body.question, MENTOR_TEXT_MAX) || !isText(body.answer, MENTOR_TEXT_MAX)) {
      return fail(ctx, 400, `question and answer must be 1 to ${MENTOR_TEXT_MAX} characters`);
    }
    if (body.citations !== undefined && (!Array.isArray(body.citations) || body.citations.length > MAX_CITATIONS)) {
      return fail(ctx, 400, `citations must be an array of at most ${MAX_CITATIONS}`);
    }
    try {
      await saveExchange({
        userId: body.userId as number,
        chatDocumentId: ctx.params.documentId,
        question: body.question,
        answer: body.answer,
        citations: body.citations,
      });
      ctx.body = { data: { ok: true } };
    } catch (error) {
      handle(ctx, error, 'save the exchange');
    }
  },

  async remove(ctx) {
    const q = readQuery(ctx.query ?? {});
    if ('error' in q) return fail(ctx, 400, q.error as string);
    if (!validId(ctx)) return fail(ctx, 404, 'Chat not found');
    try {
      // Owner check ignores age: an expired chat can still be deleted
      const chat = await strapi.documents('api::mentor-chat.mentor-chat').findFirst({
        filters: { documentId: ctx.params.documentId, authorizedUser: { id: q.userId } },
        fields: ['id'],
      } as any);
      if (!chat) return fail(ctx, 404, 'Chat not found');
      await deleteChat(ctx.params.documentId);
      ctx.body = { data: { deleted: 1 } };
    } catch (error) {
      handle(ctx, error, 'delete the chat');
    }
  },

  async removeAll(ctx) {
    const q = readQuery(ctx.query ?? {});
    if ('error' in q) return fail(ctx, 400, q.error as string);
    try {
      ctx.body = { data: { deleted: await deleteChatsOf(q.userId) } };
    } catch (error) {
      handle(ctx, error, 'delete chats');
    }
  },
};
