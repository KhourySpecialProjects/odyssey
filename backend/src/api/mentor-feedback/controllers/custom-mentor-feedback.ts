import { MENTOR_KINDS, MentorUsageError, type MentorKind } from '../../../lib/mentor-usage';
import { recordMentorFeedback, type MentorCitation } from '../../../lib/mentor-feedback';
import { fail, isCount, isRowId, isText, parseBody } from '../../../lib/route-body';

const KEYS = [
  'userId',
  'answerKey',
  'kind',
  'rating',
  'lessonId',
  'dropletId',
  'questionId',
  'citations',
  'shared',
  'answerText',
  'questionText',
  'promptVersion',
];
const ANSWER_KEY = /^[A-Za-z0-9-]{8,64}$/;
const REF = /^p\d{1,4}$/;
const BLOCK_ID = /^[A-Za-z0-9_-]{1,64}$/;
const MAX_CITATIONS = 20;

/** An error message when the citations aren't ids-only, otherwise null. */
function citationsError(value: unknown): string | null {
  if (!Array.isArray(value) || value.length > MAX_CITATIONS) {
    return `citations must be an array of at most ${MAX_CITATIONS}`;
  }
  for (const item of value as Record<string, unknown>[]) {
    if (item === null || typeof item !== 'object' || Array.isArray(item)) {
      return 'citations must hold objects';
    }
    if (Object.keys(item).some((k) => !['ref', 'blockId', 'blockIndex'].includes(k))) {
      return 'citations hold only ref, blockId and blockIndex';
    }
    if (typeof item.ref !== 'string' || !REF.test(item.ref)) return 'citation ref is invalid';
    if (item.blockId !== undefined && !(typeof item.blockId === 'string' && BLOCK_ID.test(item.blockId))) {
      return 'citation blockId is invalid';
    }
    if (item.blockIndex !== undefined && !isCount(item.blockIndex)) {
      return 'citation blockIndex must be a whole number';
    }
  }
  return null;
}

/** An error message for the first bad field, otherwise null. */
function bodyError(body: Record<string, unknown>): string | null {
  if (typeof body.answerKey !== 'string' || !ANSWER_KEY.test(body.answerKey)) {
    return 'answerKey is invalid';
  }
  if (!(MENTOR_KINDS as readonly unknown[]).includes(body.kind)) {
    return `kind must be one of ${MENTOR_KINDS.join(', ')}`;
  }
  if (body.rating !== 'up' && body.rating !== 'down') return 'rating must be up or down';
  const quizHint = body.kind === 'quiz-hint';
  if (quizHint !== (body.questionId !== undefined)) {
    return 'questionId is required for quiz-hint and not allowed otherwise';
  }
  if (quizHint && !isRowId(body.questionId)) return 'questionId must be a positive integer';
  if (body.citations !== undefined) {
    const error = citationsError(body.citations);
    if (error) return error;
  }
  if (typeof body.shared !== 'boolean') return 'shared must be true or false';
  if ((body.answerText !== undefined) !== body.shared) {
    return 'answerText is required when shared and not allowed otherwise';
  }
  if (body.answerText !== undefined && !isText(body.answerText, 20000)) {
    return 'answerText must be 1 to 20000 characters';
  }
  if ((body.questionText !== undefined) !== (body.shared && !quizHint)) {
    return 'questionText is required when sharing a typed or selected question, otherwise not allowed';
  }
  if (body.questionText !== undefined && !isText(body.questionText, 2000)) {
    return 'questionText must be 1 to 2000 characters';
  }
  if (body.promptVersion !== undefined && !isText(body.promptVersion, 40)) {
    return 'promptVersion must be text of at most 40 characters';
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
        data: await recordMentorFeedback({
          userId: body.userId as number,
          lessonId: body.lessonId as number,
          dropletId: body.dropletId as number,
          answerKey: body.answerKey as string,
          kind: body.kind as MentorKind,
          rating: body.rating as 'up' | 'down',
          questionId: body.questionId as number | undefined,
          citations: body.citations as MentorCitation[] | undefined,
          shared: body.shared as boolean,
          answerText: body.answerText as string | undefined,
          questionText: body.questionText as string | undefined,
          promptVersion: body.promptVersion as string | undefined,
        }),
      };
    } catch (err) {
      if (err instanceof MentorUsageError) return fail(ctx, err.status, err.message);
      strapi.log.error('Failed to record Mentor feedback.', err);
      return fail(ctx, 500, 'Failed to record Mentor feedback.');
    }
  },
};
