import {
  commentMarks,
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

describe("commentMarks", () => {
  const content = {
    blocks: [
      { id: "b1", text: "A loop repeats a block of code." },
      { id: "b2", text: "Second paragraph." },
    ],
  };
  const words = comment({
    id: 1,
    anchor: {
      v: 1,
      field: "blocks",
      blockId: "b1",
      start: 2,
      end: 6,
      quote: "loop",
      prefix: "A ",
      suffix: " repeats",
    },
  });
  const block = comment({
    id: 2,
    anchor: { v: 1, field: "blocks", blockId: "b2" },
  });

  it("draws open comments as pending, and a whole block with only a wash", () => {
    const { drawn, outdated } = commentMarks([words, block], content, "open");

    expect(outdated).toEqual([]);
    expect(drawn).toEqual([
      {
        id: "comment-1",
        range: {
          field: "blocks",
          blockId: "b1",
          start: 2,
          end: 6,
          exact: true,
        },
        className: "review-mark review-mark--pending",
      },
      {
        id: "comment-2",
        range: {
          field: "blocks",
          blockId: "b2",
          start: 0,
          end: 17,
          exact: true,
        },
        className: "review-mark review-mark--block",
      },
    ]);
  });

  it("tints them once the review is sent", () => {
    const { drawn } = commentMarks([words], content, "sent");
    expect(drawn[0].className).toBe("review-mark review-mark--sent");
  });

  it("doesn't draw a resolved comment", () => {
    const resolved = { ...words, resolvedAt: "2026-10-27T12:00:00Z" };
    expect(commentMarks([resolved], content, "open")).toEqual({
      drawn: [],
      outdated: [],
    });
  });

  it("lists a comment whose text was edited away as outdated", () => {
    const gone = { blocks: [{ id: "b1", text: "Something else entirely." }] };

    const { drawn, outdated } = commentMarks([words, block], gone, "open");

    expect(drawn).toEqual([]);
    expect(outdated.map((c) => c.id)).toEqual([1, 2]);
  });
});
