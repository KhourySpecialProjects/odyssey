import { z } from "zod";

// What the browser may send to recordQuizAttempt. No user id: it comes from the session.

const id = z.number().int().positive();

export const quizAttemptSchema = z
  .object({
    dropletId: id,
    lessonId: id,
    quizType: z.enum(["choice", "open-ended"]),
    questionId: id.max(2147483648),
    correct: z.boolean(),
    submitId: z.string().uuid(),
  })
  .strict();

export type QuizAttemptInput = z.infer<typeof quizAttemptSchema>;
