import { z } from "zod";
import type { ReviewAnchor } from "@/types";
import type { Anchor } from "@/lib/anchors";

const id = z.number().int().positive();

export const reviewCommentFieldSchema = z.enum([
  "blocks",
  "description",
  "overview",
  "objective",
  "name",
  "authors",
  "nextSteps",
  "prerequisites",
  "postrequisites",
  "funFact",
  "datasets",
]);
export const reviewStateSchema = z.enum(["open", "sent", "published"]);
export const aiScoringRunStateSchema = z.enum([
  "queued",
  "running",
  "done",
  "partial",
  "failed",
]);

const anchorBase = { v: z.literal(1), field: reviewCommentFieldSchema };

// Text in a block or field: its quote and context, with offsets when known.
// start/end come together, and end >= start. Across blocks (endBlockId), the
// offsets are in different blocks, so only their presence is checked. A spot
// (point) is the letters beside it, in one block.
export const textAnchorSchema = z
  .object({
    ...anchorBase,
    blockId: z.string().min(1).optional(),
    endBlockId: z.string().min(1).optional(),
    start: z.number().int().min(0).optional(),
    end: z.number().int().min(0).optional(),
    quote: z.string().min(1).max(2000),
    prefix: z.string().max(200),
    suffix: z.string().max(200),
    point: z.enum(["before", "after"]).optional(),
  })
  .strict()
  .refine((a) => (a.start === undefined) === (a.end === undefined), {
    message: "start and end must be set together",
    path: ["end"],
  })
  .refine(
    (a) =>
      a.endBlockId !== undefined ||
      a.start === undefined ||
      a.end === undefined ||
      a.end >= a.start,
    {
      message: "end must be >= start",
      path: ["end"],
    },
  )
  .refine(
    (a) =>
      a.endBlockId === undefined ||
      (a.blockId !== undefined &&
        a.start !== undefined &&
        a.endBlockId !== a.blockId),
    {
      message: "a selection across blocks needs blockId, start and end",
      path: ["endBlockId"],
    },
  )
  .refine((a) => a.point === undefined || a.endBlockId === undefined, {
    message: "a spot is in one block",
    path: ["point"],
  });

// A whole block: its id and nothing else (lib/anchors' createAnchor, ODY-801)
const wholeBlockAnchorSchema = z
  .object({ ...anchorBase, blockId: z.string().min(1) })
  .strict();

// A whole Overview section: its field and nothing else. A lesson's blocks
// are never one comment.
const wholeSectionAnchorSchema = z
  .object(anchorBase)
  .strict()
  .refine((a) => a.field !== "blocks", {
    message: "a lesson comment needs a block or text",
    path: ["field"],
  });

// Stored as JSON, so strict. Text first, so its issues are the ones reported.
export const reviewAnchorSchema = z.union([
  textAnchorSchema,
  wholeBlockAnchorSchema,
  wholeSectionAnchorSchema,
]) satisfies z.ZodType<ReviewAnchor>;

// One AI-found passage (ODY-805 contract). Its anchor is a text quote of the same text.
export const aiFindingSchema = z
  .object({
    id: z.string().min(1).max(100),
    quote: z.string().min(1).max(2000),
    reason: z.string().min(1).max(500),
    lessonId: id.nullable(),
    anchor: textAnchorSchema,
  })
  .strict()
  .refine((f) => f.anchor.quote === f.quote, {
    message: "the anchor must quote the same text",
    path: ["anchor", "quote"],
  })
  .refine((f) => (f.anchor.field === "blocks") === (f.lessonId !== null), {
    message: "Lesson passages need a lessonId, Overview passages none",
    path: ["lessonId"],
  });

// Per-section progress of an AI scoring run: lesson ids, or "overall".
const aiSectionSchema = z.union([id, z.literal("overall")]);
export const aiRunProgressSchema = z
  .object({
    done: z.array(aiSectionSchema),
    current: aiSectionSchema.nullable(),
  })
  .strict();

/**
 * An anchor from createAnchor as a review comment's anchor, or null when it
 * can't be one (a field reviews don't comment on, or a quote over 2000
 * characters).
 */
export function toReviewAnchor(anchor: Anchor): ReviewAnchor | null {
  const parsed = reviewAnchorSchema.safeParse(anchor);
  return parsed.success ? parsed.data : null;
}

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
