import {
  finishRun,
  heartbeatRun,
  startRun,
  type RunProgress,
  type RunScore,
  type RunSection,
} from '../../../lib/ai-scoring-runs';
import { ReviewScoreError } from '../../../lib/review-scores';

const MAX_INT = 2147483647; // Postgres integer column limit
const isRowId = (n: unknown): n is number =>
  typeof n === 'number' && Number.isSafeInteger(n) && n > 0 && n <= MAX_INT;
const isCount = (n: unknown): n is number =>
  typeof n === 'number' && Number.isSafeInteger(n) && n >= 0 && n <= MAX_INT;
const isText = (s: unknown, max: number): s is string =>
  typeof s === 'string' && s.length > 0 && s.length <= max;

const MAX_SCORES = 5000;
const MAX_RATIONALE = 4000;
const MAX_ERROR = 2000;
const MAX_FINDINGS = 5;
const MAX_QUOTE = 2000;
const MAX_REASON = 500;
const MAX_ANCHOR_JSON = 3000;
const END_STATES = ['done', 'partial', 'failed'];

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
 * Strict body parse. Custom routes get no strict input check, so they check
 * their own keys.
 *
 * NOTE: userId comes from the body because Strapi receives the shared
 * service token, not the end user's JWT. The Server Action resolves it from
 * the session (frontend/lib/requests/ai-scoring.ts), and the route checks it
 * against the review's reviewer.
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

function parseSections(value: unknown): value is RunSection[] {
  return (
    Array.isArray(value) &&
    value.length <= MAX_SCORES &&
    value.every((v) => v === 'overall' || isRowId(v))
  );
}

function parseProgress(value: unknown): value is RunProgress {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const keys = Object.keys(value);
  const { done, current } = value as Record<string, unknown>;
  return (
    keys.length === 2 &&
    'done' in value &&
    'current' in value &&
    parseSections(done) &&
    (current === null || current === 'overall' || isRowId(current))
  );
}

/** Bounds only: the frontend run owns the full finding shape. */
function parseFindings(value: unknown, at: string): string | null {
  if (!Array.isArray(value) || value.length > MAX_FINDINGS) {
    return `${at} must be an array of at most ${MAX_FINDINGS}`;
  }
  const allowed = ['id', 'quote', 'reason', 'lessonId', 'anchor'];
  for (const [j, f] of value.entries()) {
    const here = `${at}[${j}]`;
    if (f === null || typeof f !== 'object' || Array.isArray(f)) {
      return `${here} must be an object`;
    }
    const extra = Object.keys(f).find((key) => !allowed.includes(key));
    if (extra) return `Invalid key ${here}.${extra}`;
    if (!isText(f.id, 100)) return `${here}.id must be text of at most 100 characters`;
    if (!isText(f.quote, MAX_QUOTE)) {
      return `${here}.quote must be text of at most ${MAX_QUOTE} characters`;
    }
    if (!isText(f.reason, MAX_REASON)) {
      return `${here}.reason must be text of at most ${MAX_REASON} characters`;
    }
    if (f.lessonId !== null && !isRowId(f.lessonId)) {
      return `${here}.lessonId must be a positive integer or null`;
    }
    const { anchor } = f;
    if (
      anchor === null ||
      typeof anchor !== 'object' ||
      Array.isArray(anchor) ||
      JSON.stringify(anchor).length > MAX_ANCHOR_JSON
    ) {
      return `${here}.anchor must be an object of at most ${MAX_ANCHOR_JSON} characters`;
    }
  }
  return null;
}

function parseScores(value: unknown): { scores: RunScore[] } | { invalid: string } {
  if (!Array.isArray(value) || value.length > MAX_SCORES) {
    return { invalid: `scores must be an array of at most ${MAX_SCORES}` };
  }
  const allowed = ['lessonId', 'criterionId', 'aiValue', 'aiRationale', 'aiFindings'];
  for (const [i, s] of value.entries()) {
    if (s === null || typeof s !== 'object' || Array.isArray(s)) {
      return { invalid: `scores[${i}] must be an object` };
    }
    const extra = Object.keys(s).find((key) => !allowed.includes(key));
    if (extra) return { invalid: `Invalid key scores[${i}].${extra}` };
    if (s.lessonId !== null && !isRowId(s.lessonId)) {
      return { invalid: `scores[${i}].lessonId must be a positive integer or null` };
    }
    if (!isRowId(s.criterionId)) {
      return { invalid: `scores[${i}].criterionId must be a positive integer` };
    }
    if (!Number.isInteger(s.aiValue) || s.aiValue < 1 || s.aiValue > 5) {
      return { invalid: `scores[${i}].aiValue must be an integer from 1 to 5` };
    }
    if (!isText(s.aiRationale, MAX_RATIONALE)) {
      return {
        invalid: `scores[${i}].aiRationale must be text of at most ${MAX_RATIONALE} characters`,
      };
    }
    if (s.aiFindings !== undefined) {
      const invalid = parseFindings(s.aiFindings, `scores[${i}].aiFindings`);
      if (invalid) return { invalid };
    }
  }
  return { scores: value as RunScore[] };
}

/** Runs a run write and maps its errors to HTTP statuses. */
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
  async start(ctx) {
    const parsed = parseBody(
      ctx.request.body ?? {},
      ['reviewId', 'userId', 'model', 'promptVersion'],
      ['reviewId', 'userId'],
    );
    if ('invalid' in parsed) return fail(ctx, 400, parsed.invalid);
    const { body } = parsed;
    if (!isText(body.model, 100)) {
      return fail(ctx, 400, 'model must be text of at most 100 characters');
    }
    if (!isText(body.promptVersion, 50)) {
      return fail(ctx, 400, 'promptVersion must be text of at most 50 characters');
    }

    return run(
      ctx,
      () =>
        startRun({
          reviewId: body.reviewId as number,
          userId: body.userId as number,
          model: body.model as string,
          promptVersion: body.promptVersion as string,
        }),
      'Failed to start Score with AI.',
    );
  },

  async heartbeat(ctx) {
    const parsed = parseBody(
      ctx.request.body ?? {},
      ['runId', 'userId', 'inputTokens', 'outputTokens', 'progress', 'failedLessons', 'scores'],
      ['runId', 'userId'],
    );
    if ('invalid' in parsed) return fail(ctx, 400, parsed.invalid);
    const { body } = parsed;
    for (const key of ['inputTokens', 'outputTokens']) {
      if (!isCount(body[key])) return fail(ctx, 400, `${key} must be a whole number`);
    }
    if (body.progress !== undefined && !parseProgress(body.progress)) {
      return fail(ctx, 400, 'progress must be { done, current } with lesson ids or "overall"');
    }
    if (body.failedLessons !== undefined && !parseSections(body.failedLessons)) {
      return fail(ctx, 400, 'failedLessons must be an array of lesson ids or "overall"');
    }
    let scores: RunScore[] | undefined;
    if (body.scores !== undefined) {
      const parsedScores = parseScores(body.scores);
      if ('invalid' in parsedScores) return fail(ctx, 400, parsedScores.invalid);
      scores = parsedScores.scores;
    }

    return run(
      ctx,
      () =>
        heartbeatRun({
          runId: body.runId as number,
          userId: body.userId as number,
          inputTokens: body.inputTokens as number,
          outputTokens: body.outputTokens as number,
          progress: body.progress as RunProgress | undefined,
          failedLessons: body.failedLessons as RunSection[] | undefined,
          scores,
        }),
      'Failed to record progress.',
    );
  },

  async finish(ctx) {
    const parsed = parseBody(
      ctx.request.body ?? {},
      [
        'runId',
        'userId',
        'runState',
        'failedLessons',
        'inputTokens',
        'outputTokens',
        'error',
        'scores',
      ],
      ['runId', 'userId'],
    );
    if ('invalid' in parsed) return fail(ctx, 400, parsed.invalid);
    const { body } = parsed;
    if (!END_STATES.includes(body.runState as string)) {
      return fail(ctx, 400, `runState must be one of ${END_STATES.join(', ')}`);
    }
    const { failedLessons } = body;
    if (!parseSections(failedLessons)) {
      return fail(ctx, 400, 'failedLessons must be an array of lesson ids or "overall"');
    }
    for (const key of ['inputTokens', 'outputTokens']) {
      if (!isCount(body[key])) return fail(ctx, 400, `${key} must be a whole number`);
    }
    if (body.error !== null && !isText(body.error, MAX_ERROR)) {
      return fail(ctx, 400, `error must be null or text of at most ${MAX_ERROR} characters`);
    }
    const parsedScores = parseScores(body.scores);
    if ('invalid' in parsedScores) return fail(ctx, 400, parsedScores.invalid);

    return run(
      ctx,
      () =>
        finishRun({
          runId: body.runId as number,
          userId: body.userId as number,
          runState: body.runState as 'done' | 'partial' | 'failed',
          failedLessons,
          inputTokens: body.inputTokens as number,
          outputTokens: body.outputTokens as number,
          error: body.error as string | null,
          scores: parsedScores.scores,
        }),
      'Failed to save the AI scores.',
    );
  },
};
