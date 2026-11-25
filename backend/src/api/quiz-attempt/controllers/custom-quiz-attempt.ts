import {
  QuizAttemptError,
  QUIZ_TYPES,
  recentQuizAttempts,
  recordQuizAttempt,
  type QuizType,
} from '../../../lib/quiz-attempt';
import { fail, isRowId, parseBody } from '../../../lib/route-body';

const KEYS = ['userId', 'lessonId', 'dropletId', 'quizType', 'questionId', 'correct', 'submitId'];
const MAX_QUESTION_ID = 2147483648; // Math.abs of a 32-bit hash
const SUBMIT_ID = /^[A-Za-z0-9-]{8,64}$/;

/** An error message for the first bad field, otherwise null. */
function bodyError(body: Record<string, unknown>): string | null {
  if (!(QUIZ_TYPES as readonly unknown[]).includes(body.quizType)) {
    return `quizType must be one of ${QUIZ_TYPES.join(', ')}`;
  }
  const q = body.questionId;
  if (typeof q !== 'number' || !Number.isSafeInteger(q) || q < 0 || q > MAX_QUESTION_ID) {
    return 'questionId must be a non-negative integer';
  }
  if (typeof body.correct !== 'boolean') return 'correct must be true or false';
  if (typeof body.submitId !== 'string' || !SUBMIT_ID.test(body.submitId)) {
    return 'submitId is invalid';
  }
  return null;
}

export default {
  async record(ctx) {
    const parsed = parseBody(ctx.request.body ?? {}, KEYS, ['userId', 'lessonId', 'dropletId']);
    if ('invalid' in parsed) return fail(ctx, 400, parsed.invalid);
    const { body } = parsed;
    const error = bodyError(body);
    if (error) return fail(ctx, 400, error);

    try {
      ctx.body = {
        data: await recordQuizAttempt({
          userId: body.userId as number,
          lessonId: body.lessonId as number,
          dropletId: body.dropletId as number,
          quizType: body.quizType as QuizType,
          questionId: body.questionId as number,
          correct: body.correct as boolean,
          submitId: body.submitId as string,
        }),
      };
    } catch (err) {
      if (err instanceof QuizAttemptError) return fail(ctx, err.status, err.message);
      const detail = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      strapi.log.error(`Failed to record quiz attempt: ${detail}`);
      return fail(ctx, 500, 'Failed to record quiz attempt.');
    }
  },

  async recent(ctx) {
    const query = (ctx.query ?? {}) as Record<string, unknown>;
    const extra = Object.keys(query).find((key) => key !== 'userId');
    if (extra) return fail(ctx, 400, `Invalid key ${extra}`);
    const userId = typeof query.userId === 'string' && /^\d{1,10}$/.test(query.userId) ? Number(query.userId) : null;
    if (!isRowId(userId)) return fail(ctx, 400, 'userId must be a positive integer');

    try {
      ctx.body = { data: await recentQuizAttempts(userId) };
    } catch (err) {
      const detail = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      strapi.log.error(`Failed to read recent quiz attempts: ${detail}`);
      return fail(ctx, 500, 'Failed to read recent quiz attempts.');
    }
  },
};
