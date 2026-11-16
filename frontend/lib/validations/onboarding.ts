import { z } from "zod";

import { TIME_ZONES } from "@/lib/time-zones";

export const GOALS = ["class", "career", "self", "browsing"] as const;
export const FOCUS_AREAS = ["technical", "professional", "personal"] as const;

// Mirrors the learner-profile fields from ODY-953 until that type lands.
export type Goal = (typeof GOALS)[number];
export type FocusArea = (typeof FOCUS_AREAS)[number];

export const profileStepSchema = z.object({
  first: z.string().trim().min(1, "Enter your first name"),
  last: z.string().trim().min(1, "Enter your last name"),
  bio: z.string().trim().max(280).optional(),
  timeZone: z.enum(TIME_ZONES, { message: "Choose a time zone" }),
});

export const goalStepSchema = z.object({
  goal: z.enum(GOALS, { message: "Pick one" }),
});

export const areasStepSchema = z.object({
  focusAreas: z.array(z.enum(FOCUS_AREAS)).min(1, "Pick at least one area"),
});

export const topicsStepSchema = z.object({
  interests: z.array(z.string()).min(1, "Pick at least one topic"),
  interestNote: z.string().trim().max(280).optional(),
});

export const onboardingAnswersSchema = profileStepSchema
  .merge(goalStepSchema)
  .merge(areasStepSchema)
  .merge(topicsStepSchema);

export type OnboardingAnswers = z.infer<typeof onboardingAnswersSchema>;
export type OnboardingDraft = Partial<OnboardingAnswers>;
