import { z } from "zod";
import type { FocusArea, LearnerGoal, LearnerProfileInput } from "@/types";

export const LEARNER_GOALS = [
  "class",
  "career",
  "self",
  "browsing",
] as const satisfies readonly LearnerGoal[];

export const FOCUS_AREAS = [
  "technical",
  "professional",
  "personal",
] as const satisfies readonly FocusArea[];

export const INTEREST_NOTE_MAX = 200;

const isUnique = (values: unknown[]) => new Set(values).size === values.length;

export const LearnerProfileInputSchema = z
  .object({
    goal: z.enum(LEARNER_GOALS).nullable().optional(),
    focusAreas: z
      .array(z.enum(FOCUS_AREAS))
      .max(3)
      .transform((areas) => [...new Set(areas)])
      .optional(),
    interestTagIds: z
      .array(z.number().int().positive())
      .max(30)
      .refine(isUnique)
      .optional(),
    interestNote: z
      .string()
      .trim()
      .max(INTEREST_NOTE_MAX)
      .transform((note) => note || null)
      .nullable()
      .optional(),
  })
  .strict() satisfies z.ZodType<LearnerProfileInput, z.ZodTypeDef, unknown>;
