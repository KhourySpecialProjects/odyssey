import {
  acceptAiScores,
  ReviewScoreError,
  unconfirmScores,
  upsertReviewScore,
} from '../../../lib/review-scores';

const MAX_INT = 2147483647; // Postgres integer column limit
const isRowId = (n: unknown): n is number =>
  typeof n === 'number' && Number.isSafeInteger(n) && n > 0 && n <= MAX_INT;

const ERROR_NAMES: Record<number, string> = {
  400: 'BadRequestError',
  403: 'ForbiddenError',
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

/**
 * Strict body parse. v5's strict input checking only covers the core REST
 * routes, so custom routes check their own keys.
 *
 * NOTE: userId comes from the body because Strapi receives the shared
 * service token, not the end user's JWT. The Server Action resolves it from
 * the session (see frontend/lib/requests/reviews.ts), and the route checks it
 * against the review's reviewer.
 */
function parseBody(
  body: unknown,
  allowed: string[],
): Record<string, unknown> | { error: string } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Body must be an object' };
  }
  const record = body as Record<string, unknown>;
  const extra = Object.keys(record).find((key) => !allowed.includes(key));
  if (extra) return { error: `Invalid key ${extra}` };
  for (const key of ['reviewId', 'userId']) {
    if (!isRowId(record[key])) return { error: `${key} must be a positive integer` };
  }
  if (record.lessonId !== null && !isRowId(record.lessonId)) {
    return { error: 'lessonId must be a positive integer or null' };
  }
  return record;
}

/** Runs a score write and maps its errors to HTTP statuses. */
async function run(ctx: any, fn: () => Promise<unknown>, failMessage: string) {
  try {
    ctx.body = { data: await fn() };
  } catch (err) {
    if (err instanceof ReviewScoreError) return fail(ctx, err.status, err.message);
    strapi.log.error(failMessage, err);
    return fail(ctx, 500, failMessage);
  }
}

export default {
  async upsert(ctx) {
    const body = parseBody(ctx.request.body ?? {}, [
      'reviewId',
      'lessonId',
      'criterionId',
      'value',
      'userId',
    ]);
    if ('error' in body) return fail(ctx, 400, body.error as string);
    if (!isRowId(body.criterionId)) {
      return fail(ctx, 400, 'criterionId must be a positive integer');
    }
    const { value } = body;
    if (!Number.isInteger(value) || (value as number) < 1 || (value as number) > 5) {
      return fail(ctx, 400, 'value must be an integer from 1 to 5');
    }

    return run(
      ctx,
      () =>
        upsertReviewScore({
          reviewId: body.reviewId as number,
          lessonId: body.lessonId as number | null,
          criterionId: body.criterionId as number,
          value: value as number,
          userId: body.userId as number,
        }),
      'Failed to save the score.',
    );
  },

  async acceptAi(ctx) {
    const body = parseBody(ctx.request.body ?? {}, [
      'reviewId',
      'lessonId',
      'userId',
    ]);
    if ('error' in body) return fail(ctx, 400, body.error as string);

    return run(
      ctx,
      () =>
        acceptAiScores({
          reviewId: body.reviewId as number,
          lessonId: body.lessonId as number | null,
          userId: body.userId as number,
        }),
      'Failed to accept the AI scores.',
    );
  },

  async unconfirm(ctx) {
    const body = parseBody(ctx.request.body ?? {}, [
      'reviewId',
      'lessonId',
      'userId',
    ]);
    if ('error' in body) return fail(ctx, 400, body.error as string);

    return run(
      ctx,
      () =>
        unconfirmScores({
          reviewId: body.reviewId as number,
          lessonId: body.lessonId as number | null,
          userId: body.userId as number,
        }),
      'Failed to unconfirm the AI scores.',
    );
  },
};
