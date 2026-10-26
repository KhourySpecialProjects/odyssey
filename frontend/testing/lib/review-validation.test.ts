import {
  reviewAnchorSchema,
  reviewCommentInputSchema,
  reviewKeySchema,
  reviewScoreInputSchema,
  reviewScoreKeySchema,
  reviewScoreValueSchema,
} from "@/lib/validations/review";
import { mockReviewAnchor, mockReviewComment } from "../mocks/reviewsMock";

const validComment = {
  reviewId: 7,
  lessonId: 5,
  field: "blocks",
  anchor: mockReviewAnchor,
  body: "Nice.",
};

describe("reviewAnchorSchema", () => {
  it("parses the mock comment's anchor", () => {
    expect(reviewAnchorSchema.safeParse(mockReviewComment.anchor).success).toBe(
      true,
    );
  });

  it("accepts an anchor with no blockId", () => {
    const { blockId: _blockId, ...rest } = mockReviewAnchor;
    expect(reviewAnchorSchema.safeParse(rest).success).toBe(true);
  });

  it.each([
    ["an unknown key", { ...mockReviewAnchor, extra: 1 }],
    ["v: 2", { ...mockReviewAnchor, v: 2 }],
    ["an empty quote", { ...mockReviewAnchor, quote: "" }],
    ["start without end", { ...mockReviewAnchor, end: undefined }],
    ["end < start", { ...mockReviewAnchor, start: 9, end: 3 }],
  ])("rejects %s", (_name, anchor) => {
    expect(reviewAnchorSchema.safeParse(anchor).success).toBe(false);
  });
});

describe("reviewAnchorSchema issues", () => {
  it("reports one issue for start without end", () => {
    const result = reviewAnchorSchema.safeParse({
      ...mockReviewAnchor,
      end: undefined,
    });
    expect(result.success ? 0 : result.error.issues).toHaveLength(1);
  });
});

describe("reviewScoreValueSchema", () => {
  it.each([0, 6, 2.5])("rejects %s", (v) => {
    expect(reviewScoreValueSchema.safeParse(v).success).toBe(false);
  });

  it.each([1, 5])("accepts %s", (v) => {
    expect(reviewScoreValueSchema.safeParse(v).success).toBe(true);
  });
});

describe("key schemas", () => {
  it.each(["12:overall:3", "12:45:3"])("score key accepts %s", (k) => {
    expect(reviewScoreKeySchema.safeParse(k).success).toBe(true);
  });

  it("score key rejects 12:lesson:3", () => {
    expect(reviewScoreKeySchema.safeParse("12:lesson:3").success).toBe(false);
  });

  it("review key accepts 3:9:1", () => {
    expect(reviewKeySchema.safeParse("3:9:1").success).toBe(true);
  });

  it.each(["3:overall:1", "3:9"])("review key rejects %s", (k) => {
    expect(reviewKeySchema.safeParse(k).success).toBe(false);
  });
});

describe("reviewCommentInputSchema", () => {
  it("accepts a valid lesson comment", () => {
    expect(reviewCommentInputSchema.safeParse(validComment).success).toBe(true);
  });

  it("accepts a droplet-level comment with no lesson", () => {
    const result = reviewCommentInputSchema.safeParse({
      ...validComment,
      lessonId: null,
      field: "overview",
      anchor: { ...mockReviewAnchor, field: "overview" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects a field/anchor.field mismatch", () => {
    const result = reviewCommentInputSchema.safeParse({
      ...validComment,
      anchor: { ...mockReviewAnchor, field: "overview" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects blocks with a null lessonId", () => {
    const result = reviewCommentInputSchema.safeParse({
      ...validComment,
      lessonId: null,
    });
    expect(result.success).toBe(false);
  });

  it("rejects overview with a lessonId", () => {
    const result = reviewCommentInputSchema.safeParse({
      ...validComment,
      field: "overview",
      anchor: { ...mockReviewAnchor, field: "overview" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects a whitespace-only body", () => {
    const result = reviewCommentInputSchema.safeParse({
      ...validComment,
      body: "   ",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a documentId string in place of a numeric id", () => {
    const result = reviewCommentInputSchema.safeParse({
      ...validComment,
      reviewId: "review-7",
    });
    expect(result.success).toBe(false);
  });
});

describe("reviewScoreInputSchema", () => {
  const base = { reviewId: 7, lessonId: null, criterionId: 1 };

  it("accepts value: null", () => {
    expect(
      reviewScoreInputSchema.safeParse({ ...base, value: null }).success,
    ).toBe(true);
  });

  it("accepts value: 4", () => {
    expect(
      reviewScoreInputSchema.safeParse({ ...base, value: 4 }).success,
    ).toBe(true);
  });

  it("rejects value: 6", () => {
    expect(
      reviewScoreInputSchema.safeParse({ ...base, value: 6 }).success,
    ).toBe(false);
  });
});
