import { raiseReminder, ReminderError } from '../../../lib/reminders';

const MAX_INT = 2147483647; // Postgres integer column limit
const KEYS = [
  'userId',
  'dropletId',
  'now',
  'dayStart',
  'lastRaisedAt',
  'count',
  'content',
];

const isRowId = (n: unknown): n is number =>
  typeof n === 'number' && Number.isSafeInteger(n) && n > 0 && n <= MAX_INT;
const isInstant = (v: unknown): v is string =>
  typeof v === 'string' &&
  /^\d{4}-\d{2}-\d{2}T/.test(v) &&
  !isNaN(Date.parse(v));
const isObject = (v: unknown): v is Record<string, any> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);

const ERROR_NAMES: Record<number, string> = {
  400: 'BadRequestError',
  404: 'NotFoundError',
  409: 'ConflictError',
  500: 'InternalServerError',
};

function fail(ctx: any, status: number, message: string) {
  ctx.status = status;
  ctx.body = {
    data: null,
    error: { status, name: ERROR_NAMES[status], message, details: {} },
  };
}

/** The body's problem as a message, or null when it is valid. */
function invalidBody(body: unknown): string | null {
  if (!isObject(body) || !isObject(body.data)) {
    return `Body must be { data: { ${KEYS.join(', ')} } }`;
  }
  const outerExtra = Object.keys(body).find((key) => key !== 'data');
  if (outerExtra) return `Invalid key ${outerExtra}`;
  const { data } = body;
  const extra = Object.keys(data).find((key) => !KEYS.includes(key));
  if (extra) return `Invalid key ${extra}`;
  for (const key of ['userId', 'dropletId']) {
    if (!isRowId(data[key])) return `${key} must be a positive integer`;
  }
  for (const key of ['now', 'dayStart']) {
    if (!isInstant(data[key])) return `${key} must be an ISO datetime`;
  }
  if (data.lastRaisedAt !== null && !isInstant(data.lastRaisedAt)) {
    return 'lastRaisedAt must be an ISO datetime or null';
  }
  if (!Number.isInteger(data.count) || data.count < 0 || data.count > 100) {
    return 'count must be an integer from 0 to 100';
  }
  if (
    typeof data.content !== 'string' ||
    data.content !== data.content.trim() ||
    data.content.length < 1 ||
    data.content.length > 500
  ) {
    return 'content must be a trimmed string of 1 to 500 characters';
  }
  return null;
}

// NOTE: userId comes from the body because Strapi receives the shared service
// token, not the learner's JWT. The Next.js server resolves it from the session.
export default {
  /** POST /announcements/raise-reminder { data: { userId, dropletId, now, dayStart, lastRaisedAt, count, content } } */
  async raiseReminder(ctx) {
    const body = ctx.request.body ?? {};
    const invalid = invalidBody(body);
    if (invalid) return fail(ctx, 400, invalid);
    try {
      ctx.body = { data: await raiseReminder(body.data) };
    } catch (err) {
      if (err instanceof ReminderError)
        return fail(ctx, err.status, err.message);
      strapi.log.error('Failed to raise a reminder.', err);
      return fail(ctx, 500, 'Failed to raise a reminder.');
    }
  },
};
