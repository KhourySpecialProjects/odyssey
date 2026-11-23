import type Anthropic from "@anthropic-ai/sdk";

/**
 * The models AI review may run on (ODY-813). Opus and Fable are left out on
 * purpose; add a model here, with its prices below, to allow it.
 */
export const AI_REVIEW_MODELS = [
  "claude-sonnet-5-5",
  "claude-haiku-5-5",
] as const;
export type AiReviewModel = (typeof AI_REVIEW_MODELS)[number];
export const DEFAULT_MODEL: AiReviewModel = "claude-sonnet-5-5";

export const EFFORTS = ["low", "medium", "high", "xhigh", "max"] as const;
export type Effort = (typeof EFFORTS)[number];
/** Set explicitly: Haiku 5.5 defaults to medium, Sonnet 5.5 to high. */
export const DEFAULT_EFFORT: Effort = "high";

export function parseModel(value: string | undefined): AiReviewModel {
  if (value === undefined) return DEFAULT_MODEL;
  if ((AI_REVIEW_MODELS as readonly string[]).includes(value)) {
    return value as AiReviewModel;
  }
  throw new Error(
    `Model "${value}" is not allowed for AI review. Use one of: ${AI_REVIEW_MODELS.join(", ")}`,
  );
}

export function parseEffort(value: string | undefined): Effort {
  if (value === undefined) return DEFAULT_EFFORT;
  if ((EFFORTS as readonly string[]).includes(value)) return value as Effort;
  throw new Error(`Effort "${value}" must be one of: ${EFFORTS.join(", ")}`);
}

type Price = { input: number; output: number };

/**
 * US dollars per million tokens, from Anthropic's price list in October 2026.
 * Check https://www.anthropic.com/pricing before trusting a total. Haiku 5.5
 * costs more once a prompt passes 100K tokens.
 */
const PRICES: Record<AiReviewModel, { base: Price; over100k?: Price }> = {
  "claude-sonnet-5-5": { base: { input: 2, output: 10 } },
  "claude-haiku-5-5": {
    base: { input: 0.1, output: 0.5 },
    over100k: { input: 0.5, output: 2.5 },
  },
};

const CACHE_WRITE = 1.25; // 5-minute cache writes, as a multiple of input
const CACHE_READ = 0.1;
const BATCH = 0.5;

/** What one response cost, in US dollars. Batch requests are half price. */
export function costOf(
  usage: Anthropic.Usage,
  model: AiReviewModel,
  { batch }: { batch: boolean },
): number {
  const cacheWrite = usage.cache_creation_input_tokens ?? 0;
  const cacheRead = usage.cache_read_input_tokens ?? 0;
  const prompt = usage.input_tokens + cacheWrite + cacheRead;
  const { base, over100k } = PRICES[model];
  const price = over100k && prompt > 100_000 ? over100k : base;

  const dollars =
    (usage.input_tokens * price.input +
      cacheWrite * price.input * CACHE_WRITE +
      cacheRead * price.input * CACHE_READ +
      usage.output_tokens * price.output) /
    1_000_000;
  return batch ? dollars * BATCH : dollars;
}

/** A rough cost before running: about 4 characters a token, and a guess at the output. */
export function estimateCost(
  promptChars: number[],
  model: AiReviewModel,
  {
    batch,
    outputTokensEach = 3000,
  }: { batch: boolean; outputTokensEach?: number },
): number {
  return promptChars.reduce(
    (sum, chars) =>
      sum +
      costOf(
        {
          input_tokens: Math.ceil(chars / 4),
          output_tokens: outputTokensEach,
        } as Anthropic.Usage,
        model,
        { batch },
      ),
    0,
  );
}
