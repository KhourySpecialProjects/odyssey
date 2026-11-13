import { z } from "zod";
import { MENTOR_KINDS } from "@/lib/mentor/types";

// What the browser may send to saveMentorFeedback. No user id: it comes from the session.

const id = z.number().int().positive();

export const mentorFeedbackSchema = z
  .object({
    answerKey: z.string().regex(/^[A-Za-z0-9-]{8,64}$/),
    kind: z.enum(MENTOR_KINDS),
    rating: z.enum(["up", "down"]),
    dropletId: id,
    lessonId: id,
    questionId: id.optional(),
    citations: z
      .array(
        z
          .object({
            ref: z.string().regex(/^p\d{1,4}$/),
            blockId: z
              .string()
              .regex(/^[A-Za-z0-9_-]{1,64}$/)
              .optional(),
            blockIndex: z.number().int().nonnegative(),
          })
          .strict(),
      )
      .max(20),
    shared: z.boolean(),
    answerText: z.string().min(1).max(20000).optional(),
    questionText: z.string().min(1).max(2000).optional(),
  })
  .strict();

export type MentorFeedbackInput = z.infer<typeof mentorFeedbackSchema>;
