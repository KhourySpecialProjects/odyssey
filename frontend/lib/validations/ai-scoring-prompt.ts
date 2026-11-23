import { z } from "zod";

/** Same limits as `AI_SCORING_PROMPT_LIMITS` in the backend. */
export const AI_SCORING_PROMPT_LIMITS = {
  instructions: 6000,
  lessonScope: 1500,
  overallScope: 1500,
} as const;

const part = (max: number) => z.string().trim().min(1).max(max);

export const aiScoringPromptSchema = z
  .object({
    instructions: part(AI_SCORING_PROMPT_LIMITS.instructions),
    lessonScope: part(AI_SCORING_PROMPT_LIMITS.lessonScope),
    overallScope: part(AI_SCORING_PROMPT_LIMITS.overallScope),
  })
  .strict();
