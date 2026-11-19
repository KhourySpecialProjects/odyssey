import { z } from "zod";

import { TIME_ZONES } from "@/lib/time-zones";
import {
  FOCUS_AREAS,
  INTEREST_NOTE_MAX,
  LEARNER_GOALS,
} from "@/lib/validations/learner-profile";

export const BIO_MAX = 400; // matches the authorized-user bio limit

export const profileStepSchema = z.object({
  firstName: z.string().trim().min(1, "Enter your first name"),
  lastName: z.string().trim().min(1, "Enter your last name"),
  timeZone: z.enum(TIME_ZONES, { message: "Choose a time zone" }),
  bio: z
    .string()
    .trim()
    .max(BIO_MAX, `Keep it under ${BIO_MAX} characters`)
    .optional(),
});

export const goalStepSchema = z.object({
  goal: z.enum(LEARNER_GOALS, { message: "Pick one" }),
});

export const areasStepSchema = z.object({
  focusAreas: z
    .array(z.enum(FOCUS_AREAS))
    .min(1, "Pick at least one area")
    .max(FOCUS_AREAS.length),
});

export const topicsStepSchema = z.object({
  interestTagIds: z
    .array(z.number().int().positive())
    .min(1, "Pick at least one topic")
    .max(30, "Pick up to 30 topics"),
  interestNote: z
    .string()
    .trim()
    .max(INTEREST_NOTE_MAX, `Keep it under ${INTEREST_NOTE_MAX} characters`)
    .optional(),
});

export const onboardingAnswersSchema = profileStepSchema
  .merge(goalStepSchema)
  .merge(areasStepSchema)
  .merge(topicsStepSchema);

export type OnboardingAnswers = z.infer<typeof onboardingAnswersSchema>;
export type OnboardingDraft = Partial<OnboardingAnswers>;
