import {
  AI_SCORING_PROMPT_LIMITS,
  savePromptSettings,
  type PromptParts,
} from '../../../lib/ai-scoring-settings';

const KEYS = Object.keys(AI_SCORING_PROMPT_LIMITS) as (keyof PromptParts)[];
const isObject = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);

function fail(ctx: any, status: number, message: string) {
  const name = status === 400 ? 'BadRequestError' : 'InternalServerError';
  ctx.status = status;
  ctx.body = { data: null, error: { status, name, message, details: {} } };
}

export default {
  async savePrompt(ctx) {
    const body = ctx.request.body;
    if (!isObject(body)) return fail(ctx, 400, 'Body must be an object');
    const extraTop = Object.keys(body).find((k) => k !== 'data');
    if (extraTop) return fail(ctx, 400, `Invalid key ${extraTop}`);
    if (!isObject(body.data)) return fail(ctx, 400, 'data must be an object');
    const extra = Object.keys(body.data).find(
      (k) => !(KEYS as string[]).includes(k),
    );
    if (extra) return fail(ctx, 400, `Invalid key ${extra}`);

    const parts = {} as PromptParts;
    for (const key of KEYS) {
      const value = body.data[key];
      const max = AI_SCORING_PROMPT_LIMITS[key];
      const text = typeof value === 'string' ? value.trim() : value;
      if (
        text !== null &&
        !(typeof text === 'string' && text.length >= 1 && text.length <= max)
      ) {
        return fail(
          ctx,
          400,
          `${key} must be null or text of 1 to ${max} characters`,
        );
      }
      parts[key] = text as string | null;
    }

    try {
      ctx.body = { data: await savePromptSettings(parts) };
    } catch (err) {
      strapi.log.error('Failed to save the Scorecard prompts.', err);
      return fail(ctx, 500, 'Failed to save the Scorecard prompts.');
    }
  },
};
