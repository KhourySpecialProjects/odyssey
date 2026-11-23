import {
  checkMentorAllowance,
  MENTOR_KINDS,
  MentorUsageError,
  recordMentorUsage,
} from '../../../lib/mentor-usage';
import { fail, isCount, isText, parseBody } from '../../../lib/route-body';

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
