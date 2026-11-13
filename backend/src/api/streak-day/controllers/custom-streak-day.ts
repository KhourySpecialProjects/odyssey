import {
  isCalendarDate,
  recordStreakDay,
  reviveStreakDay,
  StreakDayError,
} from '../../../lib/streak-days';

const MAX_INT = 2147483647; // Postgres integer column limit
const isRowId = (n: unknown): n is number =>
  typeof n === 'number' && Number.isSafeInteger(n) && n > 0 && n <= MAX_INT;

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

const isObject = (v: unknown): v is Record<string, any> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);

/**
 * `{ data: {...} }` with only `allowed` keys inside, every id a positive
 * integer and `date` a real YYYY-MM-DD. Custom routes get no strict input
 * check, so the keys are checked here.
 */
function parseData(
  body: unknown,
  allowed: string[],
  ids: string[]
): { data: Record<string, any> } | { invalid: string } {
  if (!isObject(body) || !isObject(body.data)) {
    return { invalid: `Body must be { data: { ${allowed.join(', ')} } }` };
  }
  const outerExtra = Object.keys(body).find((key) => key !== 'data');
  if (outerExtra) return { invalid: `Invalid key ${outerExtra}` };
  const { data } = body;
  const extra = Object.keys(data).find((key) => !allowed.includes(key));
  if (extra) return { invalid: `Invalid key ${extra}` };
  for (const key of ids) {
    if (!isRowId(data[key]))
      return { invalid: `${key} must be a positive integer` };
  }
  if (!isCalendarDate(data.date)) {
    return { invalid: 'date must be a calendar date written YYYY-MM-DD' };
  }
  return { data };
}

/** Runs a streak write and maps its errors to HTTP statuses. */
async function run(ctx: any, fn: () => Promise<unknown>, failMessage: string) {
  try {
    ctx.body = { data: await fn() };
  } catch (err) {
    if (err instanceof StreakDayError)
      return fail(ctx, err.status, err.message);
    strapi.log.error(failMessage, err);
    return fail(ctx, 500, failMessage);
  }
}

// NOTE: userId and date come from the body because Strapi receives the shared
// service token, not the learner's JWT. The Next.js server resolves the user
// from the session and the date from their time zone.
export default {
  /** POST /streak-days/record { data: { userId, date, lessonId } } */
  async record(ctx) {
    const parsed = parseData(
      ctx.request.body ?? {},
      ['userId', 'date', 'lessonId'],
      ['userId', 'lessonId']
    );
    if ('invalid' in parsed) return fail(ctx, 400, parsed.invalid);
    const { userId, date, lessonId } = parsed.data;
    return run(
      ctx,
      () => recordStreakDay({ userId, date, lessonId }),
      'Failed to record a streak day.'
    );
  },

  /** POST /streak-days/revive { data: { userId, date } }: 409 when it can't be revived */
  async revive(ctx) {
    const parsed = parseData(
      ctx.request.body ?? {},
      ['userId', 'date'],
      ['userId']
    );
    if ('invalid' in parsed) return fail(ctx, 400, parsed.invalid);
    const { userId, date } = parsed.data;
    return run(
      ctx,
      () => reviveStreakDay({ userId, date }),
      'Failed to revive the streak.'
    );
  },
};
