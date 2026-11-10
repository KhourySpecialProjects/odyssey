import {
  checkMentorAllowance,
  MENTOR_KINDS,
  MentorUsageError,
  recordMentorUsage,
} from '../../../lib/mentor-usage';

const MAX_INT = 2147483647; // Postgres integer column limit
const isRowId = (n: unknown): n is number =>
  typeof n === 'number' && Number.isSafeInteger(n) && n > 0 && n <= MAX_INT;
const isCount = (n: unknown): n is number =>
  typeof n === 'number' && Number.isSafeInteger(n) && n >= 0 && n <= MAX_INT;
const isText = (s: unknown, max: number): s is string =>
  typeof s === 'string' && s.length > 0 && s.length <= max;

const ERROR_NAMES: Record<number, string> = {
  400: 'BadRequestError',
  404: 'NotFoundError',
  500: 'InternalServerError',
};

function fail(ctx: any, status: number, message: string) {
  ctx.status = status;
  ctx.body = {
    data: null,
    error: { status, name: ERROR_NAMES[status], message, details: {} },
  };
}

/**
 * Strict body parse. Custom routes get no strict input check, so they check
 * their own keys.
 *
 * NOTE: userId comes from the body because Strapi receives the shared
 * service token, not the end user's JWT. The Next.js route handler resolves it
 * from the session (frontend/lib/mentor/usage.ts).
 */
function parseBody(
  body: unknown,
  allowed: string[],
  ids: string[],
): { body: Record<string, unknown> } | { invalid: string } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { invalid: 'Body must be an object' };
  }
  const record = body as Record<string, unknown>;
  const extra = Object.keys(record).find((key) => !allowed.includes(key));
  if (extra) return { invalid: `Invalid key ${extra}` };
  for (const key of ids) {
    if (!isRowId(record[key])) return { invalid: `${key} must be a positive integer` };
  }
  return { body: record };
}

/** Runs a Mentor call and maps its errors to HTTP statuses. */
async function run(ctx: any, fn: () => Promise<unknown>, failMessage: string) {
  try {
    ctx.body = { data: await fn() };
  } catch (err) {
    if (err instanceof MentorUsageError) return fail(ctx, err.status, err.message);
    strapi.log.error(failMessage, err);
    return fail(ctx, 500, failMessage);
  }
}

export default {
  async check(ctx) {
    const parsed = parseBody(ctx.request.body ?? {}, ['userId'], ['userId']);
    if ('invalid' in parsed) return fail(ctx, 400, parsed.invalid);
    const userId = parsed.body.userId as number;

    return run(ctx, () => checkMentorAllowance(userId), 'Failed to check Mentor usage.');
  },

  async record(ctx) {
    const parsed = parseBody(
      ctx.request.body ?? {},
      ['userId', 'kind', 'model', 'inputTokens', 'outputTokens'],
      ['userId'],
    );
    if ('invalid' in parsed) return fail(ctx, 400, parsed.invalid);
    const { body } = parsed;
    if (!(MENTOR_KINDS as readonly unknown[]).includes(body.kind)) {
      return fail(ctx, 400, `kind must be one of ${MENTOR_KINDS.join(', ')}`);
    }
    if (!isText(body.model, 100)) {
      return fail(ctx, 400, 'model must be text of at most 100 characters');
    }
    for (const key of ['inputTokens', 'outputTokens']) {
      if (!isCount(body[key])) return fail(ctx, 400, `${key} must be a whole number`);
    }

    return run(
      ctx,
      () =>
        recordMentorUsage({
          userId: body.userId as number,
          kind: body.kind as (typeof MENTOR_KINDS)[number],
          model: body.model as string,
          inputTokens: body.inputTokens as number,
          outputTokens: body.outputTokens as number,
        }),
      'Failed to record Mentor usage.',
    );
  },
};
