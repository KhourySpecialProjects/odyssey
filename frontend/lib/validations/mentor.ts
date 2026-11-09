import { z } from "zod";
import type { MentorInput, MentorTurn } from "@/lib/mentor/types";

// A request to Mentor (ODY-885), and the body of POST /api/mentor (ODY-886),
// which adds dropletId and lessonId with `.and()`: a discriminated union has
// no `.extend()`. Unknown keys are dropped, not rejected: lesson text or
// answers the browser sends are ignored.

export const MENTOR_MESSAGE_MAX = 1000;
export const MENTOR_SELECTION_MAX = 300;
/** Three exchanges */
export const MENTOR_HISTORY_MAX = 6;
/** Mentor's earlier replies; the student's are held to MENTOR_MESSAGE_MAX */
export const MENTOR_REPLY_MAX = 2000;

const text = (max: number) => z.string().trim().min(1).max(max);

/** A page id: quiz-question.tsx sends option ids as strings */
const id = z.union([
  z.number().int().nonnegative(),
  z
    .string()
    .regex(/^\d+$/)
    .transform((value) => Number(value)),
]);

/** Oldest first, from the student's turn to Mentor's, none of them blank */
export const isAlternating = (history: MentorTurn[]) =>
  history.length % 2 === 0 &&
  history.every(
    (turn, i) =>
      turn.role === (i % 2 ? "mentor" : "student") && turn.text.trim() !== "",
  );

const history = z
  .array(
    z.discriminatedUnion("role", [
      z.object({ role: z.literal("student"), text: text(MENTOR_MESSAGE_MAX) }),
      z.object({ role: z.literal("mentor"), text: text(MENTOR_REPLY_MAX) }),
    ]),
  )
  .max(MENTOR_HISTORY_MAX)
  .refine(isAlternating, "Turns alternate, from the student's to Mentor's")
  .optional();

export const mentorInputSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("lesson"),
    message: text(MENTOR_MESSAGE_MAX),
    history,
  }),
  z.object({
    kind: z.literal("explain"),
    selection: text(MENTOR_SELECTION_MAX),
    history,
  }),
  z.object({
    kind: z.literal("quiz-hint"),
    questionId: id,
    answerIds: z.array(id).min(1).max(10),
  }),
]) satisfies z.ZodType<MentorInput, z.ZodTypeDef, unknown>;

/** Numeric ids, as `id` filters take: not documentIds */
const ids = z.object({
  dropletId: z.number().int().positive(),
  lessonId: z.number().int().positive(),
});

export type MentorRequest = MentorInput & {
  dropletId: number;
  lessonId: number;
};

/** POST /api/mentor's body. Each side drops its own unknown keys. */
export const mentorRequestSchema = mentorInputSchema.and(
  ids,
) satisfies z.ZodType<MentorRequest, z.ZodTypeDef, unknown>;
