import {
  clearTestStreakDays,
  isCalendarDate,
  recordStreakDay,
  reviveStreakDay,
  setTestStreakDays,
  StreakDayError,
  streakTestingOn,
  type TestStreakDay,
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
  if (allowed.includes('date') && !isCalendarDate(data.date)) {
    return { invalid: 'date must be a calendar date written YYYY-MM-DD' };
  }
  if ('test' in data && typeof data.test !== 'boolean') {
    return { invalid: 'test must be true or false' };
  }
  return { data };
}

/** The testing panel's days (ODY-921): at most 400, each a distinct real date */
function parseTestDays(days: unknown): TestStreakDay[] | null {
  if (!Array.isArray(days) || days.length > 400) return null;
  const seen = new Set<string>();
  for (const day of days) {
    if (!isObject(day)) return null;
    const keys = Object.keys(day);
    if (keys.some((k) => !['date', 'lessons', 'revived'].includes(k)))
      return null;
    if (!isCalendarDate(day.date) || seen.has(day.date)) return null;
    if (!Number.isInteger(day.lessons) || day.lessons < 0 || day.lessons > 50)
      return null;
    if ('revived' in day && typeof day.revived !== 'boolean') return null;
    seen.add(day.date);
  }
  return days as TestStreakDay[];
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
      ['userId', 'date', 'lessonId', 'test'],
      ['userId', 'lessonId']
    );
    if ('invalid' in parsed) return fail(ctx, 400, parsed.invalid);
    const { userId, date, lessonId, test = false } = parsed.data;
    if (test && !streakTestingOn()) return fail(ctx, 404, 'Not Found');
    return run(
      ctx,
      () => recordStreakDay({ userId, date, lessonId, test }),
      'Failed to record a streak day.'
    );
  },

  /** POST /streak-days/revive { data: { userId, date } }: 409 when it can't be revived */
  async revive(ctx) {
    const parsed = parseData(
      ctx.request.body ?? {},
      ['userId', 'date', 'test'],
      ['userId']
    );
    if ('invalid' in parsed) return fail(ctx, 400, parsed.invalid);
    const { userId, date, test = false } = parsed.data;
    if (test && !streakTestingOn()) return fail(ctx, 404, 'Not Found');
    return run(
      ctx,
      () => reviveStreakDay({ userId, date, test }),
      'Failed to revive the streak.'
    );
  },

  // The streak testing panel (ODY-921, temporary): 404 unless testing is on

  /** POST /streak-days/test/set { data: { userId, days: [{ date, lessons, revived? }] } } */
  async setTest(ctx) {
    if (!streakTestingOn()) return fail(ctx, 404, 'Not Found');
    const parsed = parseData(
      ctx.request.body ?? {},
      ['userId', 'days'],
      ['userId']
    );
    if ('invalid' in parsed) return fail(ctx, 400, parsed.invalid);
    const days = parseTestDays(parsed.data.days);
    if (!days) {
      return fail(
        ctx,
        400,
        'days must be at most 400 distinct { date, lessons (0-50), revived? }'
      );
    }
    return run(
      ctx,
      () => setTestStreakDays({ userId: parsed.data.userId, days }),
      'Failed to set the test streak.'
    );
  },

  /** POST /streak-days/test/clear { data: { userId } } */
  async clearTest(ctx) {
    if (!streakTestingOn()) return fail(ctx, 404, 'Not Found');
    const parsed = parseData(ctx.request.body ?? {}, ['userId'], ['userId']);
    if ('invalid' in parsed) return fail(ctx, 400, parsed.invalid);
    return run(
      ctx,
      () => clearTestStreakDays({ userId: parsed.data.userId }),
      'Failed to clear the test streak.'
    );
  },
};
