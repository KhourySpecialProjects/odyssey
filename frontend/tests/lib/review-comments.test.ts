import {
  commentCounts,
  commentStripText,
  commentsOnLesson,
} from "@/lib/review-comments";
import type { ReviewComment } from "@/types";

const comment = (over: Partial<ReviewComment>): ReviewComment => ({
  id: 1,
  field: "blocks",
  anchor: { v: 1, field: "blocks", blockId: "b1" },
  body: "x",
  resolvedAt: null,
  ...over,
});

describe("commentsOnLesson", () => {
  it("keeps only block comments on that lesson", () => {
    const mine = comment({ id: 1, lesson: { id: 4 } as never });
    const other = comment({ id: 2, lesson: { id: 5 } as never });
    const overview = comment({
      id: 3,
      field: "overview",
      anchor: { v: 1, field: "overview", quote: "q", prefix: "", suffix: "" },
      lesson: null,
    });

    expect(commentsOnLesson([mine, other, overview], 4)).toEqual([mine]);
  });
});

describe("commentCounts", () => {
  const list = [
    comment({ id: 1 }),
    comment({ id: 2 }),
    comment({ id: 3, resolvedAt: "2026-10-27T12:00:00Z" }),
  ];

  it("counts every comment, and the unresolved ones as pending while open", () => {
    expect(commentCounts(list, "open")).toEqual({ total: 3, pending: 2 });
  });

  it("treats no review yet as open", () => {
    expect(commentCounts(list, undefined)).toEqual({ total: 3, pending: 2 });
  });

  it("has nothing pending once the review is sent", () => {
    expect(commentCounts(list, "sent")).toEqual({ total: 3, pending: 0 });
  });
});

describe("commentStripText", () => {
  it("reads like the design", () => {
    expect(commentStripText({ total: 3, pending: 2 })).toBe(
      "3 comments on this lesson · 2 pending",
    );
  });

  it("uses the singular for one", () => {
    expect(commentStripText({ total: 1, pending: 1 })).toBe(
      "1 comment on this lesson · 1 pending",
    );
  });

  it("names another place", () => {
    expect(commentStripText({ total: 0, pending: 0 }, "the Overview")).toBe(
      "0 comments on the Overview · 0 pending",
    );
  });
});
