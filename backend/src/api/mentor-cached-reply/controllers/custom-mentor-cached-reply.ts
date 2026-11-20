import {
  CACHED_REPLY_SCOPES,
  CACHED_REPLY_TEXT_MAX,
  findCachedReply,
  storeCachedReply,
  type CachedReplyScope,
  type StoreCachedReplyInput,
} from '../../../lib/mentor-cached-replies';
import { fail, isText, parseBody } from '../../../lib/route-body';

// A hint slot's question and option ids can be 0 (BlockNote id hashes), so no isRowId here
const SLOT = {
  lesson: /^lesson:(\d{1,10})$/,
  hint: /^hint:(\d{1,10}):\d{1,10}:\d{1,10}$/,
};
const KEY = /^(?:lesson:\d{1,10}|hint:\d{1,10}:\d{1,10}:\d{1,10}):[0-9a-f]{64}$/;

const STORE_KEYS = ['key', 'slot', 'scope', 'dropletId', 'lessonId', 'promptVersion', 'model', 'text'];

/** An error message for the first bad field, otherwise null. */
function bodyError(body: Record<string, unknown>): string | null {
  const scope = body.scope as CachedReplyScope;
  if (!CACHED_REPLY_SCOPES.includes(scope)) return `scope must be one of ${CACHED_REPLY_SCOPES.join(', ')}`;
  const slotId = typeof body.slot === 'string' ? SLOT[scope].exec(body.slot)?.[1] : undefined;
  if (slotId === undefined || Number(slotId) !== body.lessonId) return 'slot is invalid or does not match lessonId';
  if (typeof body.key !== 'string' || !KEY.test(body.key) || !body.key.startsWith(`${body.slot}:`)) {
    return 'key is invalid or does not match slot';
  }
  if (!isText(body.promptVersion, 40)) return 'promptVersion must be 1 to 40 characters';
  if (!isText(body.model, 100)) return 'model must be 1 to 100 characters';
  if (!isText(body.text, CACHED_REPLY_TEXT_MAX)) return `text must be 1 to ${CACHED_REPLY_TEXT_MAX} characters`;
  return null;
}

export default {
  async find(ctx) {
    const parsed = parseBody(ctx.request.body ?? {}, ['key'], []);
    if ('invalid' in parsed) return fail(ctx, 400, parsed.invalid);
    const { key } = parsed.body;
    if (typeof key !== 'string' || !KEY.test(key)) return fail(ctx, 400, 'key is invalid');
    try {
      ctx.body = { data: { text: await findCachedReply(key) } };
    } catch (err) {
      strapi.log.error('Failed to find a Mentor cached reply.', err);
      return fail(ctx, 500, 'Failed to find the reply.');
    }
  },

  async store(ctx) {
    const parsed = parseBody(ctx.request.body ?? {}, STORE_KEYS, ['dropletId', 'lessonId']);
    if ('invalid' in parsed) return fail(ctx, 400, parsed.invalid);
    const error = bodyError(parsed.body);
    if (error) return fail(ctx, 400, error);
    try {
      ctx.body = { data: await storeCachedReply(parsed.body as StoreCachedReplyInput) };
    } catch (err) {
      strapi.log.error('Failed to store a Mentor cached reply.', err);
      return fail(ctx, 500, 'Failed to store the reply.');
    }
  },
};
