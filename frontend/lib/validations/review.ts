import { z } from "zod";
import type { ReviewAnchor } from "@/types";

const id = z.number().int().positive();

export const reviewCommentFieldSchema = z.enum([
  "blocks",
  "description",
  "overview",
  "objective",
]);
export const reviewStateSchema = z.enum(["open", "sent", "published"]);
export const aiScoringRunStateSchema = z.enum([
  "queued",
  "running",
  "done",
  "partial",
  "failed",
]);

// Stored as JSON, so strict. start/end come together, and end >= start.
export const reviewAnchorSchema = z
  .object({
    v: z.literal(1),
    field: reviewCommentFieldSchema,
    blockId: z.string().min(1).optional(),
    start: z.number().int().min(0).optional(),
    end: z.number().int().min(0).optional(),
    quote: z.string().min(1).max(2000),
    prefix: z.string().max(200),
    suffix: z.string().max(200),
  })
  .strict()
  .refine((a) => (a.start === undefined) === (a.end === undefined), {
    message: "start and end must be set together",
    path: ["end"],
  })
  .refine(
    (a) => a.start === undefined || a.end === undefined || a.end >= a.start,
    {
      message: "end must be >= start",
      path: ["end"],
    },
  ) satisfies z.ZodType<ReviewAnchor>;

export const reviewScoreValueSchema = z.number().int().min(1).max(5);

/** `<reviewId>:<lessonId|overall>:<criterionId>` */
export const reviewScoreKeySchema = z.string().regex(/^\d+:(\d+|overall):\d+$/);

/** `<dropletId>:<reviewerId>:<round>` */
export const reviewKeySchema = z.string().regex(/^\d+:\d+:\d+$/);

export const reviewCommentBodySchema = z.string().trim().min(1).max(5000);

export const reviewCommentInputSchema = z
  .object({
    reviewId: id,
    lessonId: id.nullable(),
    field: reviewCommentFieldSchema,
    anchor: reviewAnchorSchema,
    body: reviewCommentBodySchema,
  })
  .refine((c) => c.anchor.field === c.field, {
    message: "anchor.field must match field",
    path: ["anchor", "field"],
  })
  .refine((c) => (c.field === "blocks") === (c.lessonId !== null), {
    message: "Lesson comments need a lessonId, droplet-level comments none",
    path: ["lessonId"],
  });

export const reviewScoreInputSchema = z.object({
  reviewId: id,
  lessonId: id.nullable(),
  criterionId: id,
  value: reviewScoreValueSchema.nullable(),
});

/** A reviewer's save from a slider: the upsert route takes only 1–5. */
export const reviewScoreSaveSchema = reviewScoreInputSchema.extend({
  value: reviewScoreValueSchema,
});

/** One lesson's scores, or the Overall Score when `lessonId` is null. */
export const reviewScoreScopeSchema = z.object({
  reviewId: id,
  lessonId: id.nullable(),
});

export type ReviewCommentInput = z.infer<typeof reviewCommentInputSchema>;
export type ReviewScoreInput = z.infer<typeof reviewScoreInputSchema>;
export type ReviewScoreSave = z.infer<typeof reviewScoreSaveSchema>;
