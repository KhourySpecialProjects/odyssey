import { isCalendarDate, recordStreakDay, StreakDayError } from '../../../lib/streak-days';

const MAX_INT = 2147483647; // Postgres integer column limit
const isRowId = (n: unknown): n is number =>
  typeof n === 'number' && Number.isSafeInteger(n) && n > 0 && n <= MAX_INT;

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

const ALLOWED = ['userId', 'date', 'lessonId'];

export default {
  /**
   * POST /streak-days/record { data: { userId, date, lessonId } }. Custom
   * routes get no strict input check, so the keys are checked here.
   *
   * NOTE: userId and date come from the body because Strapi receives the
   * shared service token, not the learner's JWT. The Next.js server resolves
   * the user from the session and the date from their time zone.
   */
  async record(ctx) {
    const isObject = (v: unknown): v is Record<string, any> =>
      v !== null && typeof v === 'object' && !Array.isArray(v);
    const outer = ctx.request.body ?? {};
    if (!isObject(outer) || !isObject(outer.data)) {
      return fail(ctx, 400, 'Body must be { data: { userId, date, lessonId } }');
    }
    const outerExtra = Object.keys(outer).find((key) => key !== 'data');
    if (outerExtra) return fail(ctx, 400, `Invalid key ${outerExtra}`);
    const body = outer.data;
    const extra = Object.keys(body).find((key) => !ALLOWED.includes(key));
    if (extra) return fail(ctx, 400, `Invalid key ${extra}`);
    for (const key of ['userId', 'lessonId']) {
      if (!isRowId(body[key])) return fail(ctx, 400, `${key} must be a positive integer`);
    }
    if (!isCalendarDate(body.date)) {
      return fail(ctx, 400, 'date must be a calendar date written YYYY-MM-DD');
    }

    try {
      ctx.body = {
        data: await recordStreakDay({
          userId: body.userId,
          date: body.date,
          lessonId: body.lessonId,
        }),
      };
    } catch (err) {
      if (err instanceof StreakDayError) return fail(ctx, err.status, err.message);
      strapi.log.error('Failed to record a streak day.', err);
      return fail(ctx, 500, 'Failed to record a streak day.');
    }
  },
};
