import {
  blockLabel,
  blockTypes,
  commentSnippet,
  numberComments,
  commentMarks,
  commentCounts,
  commentStripText,
  commentsOnLesson,
  blocksSpanned,
  commentTime,
  isWholeSection,
  decorateMarks,
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
  it("reads like the prototype", () => {
    expect(commentStripText({ total: 3, pending: 2 })).toBe(
      "3 comments on this lesson · 2 pending · sent when you request changes",
    );
  });

  it("uses the singular for one", () => {
    expect(commentStripText({ total: 1, pending: 1 })).toBe(
      "1 comment on this lesson · 1 pending · sent when you request changes",
    );
  });

  it("names another place, and leaves out pending when none are", () => {
    expect(commentStripText({ total: 2, pending: 0 }, "the Overview")).toBe(
      "2 comments on the Overview",
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

  it("draws open comments as pending, and a whole block with no mark of its own", () => {
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

  it("gives a resolved comment a dotted mark", () => {
    const resolved = { ...words, resolvedAt: "2026-10-27T12:00:00Z" };
    const { drawn, outdated } = commentMarks([resolved], content, "open");
    expect(drawn.map((m) => m.className)).toEqual([
      "review-mark review-mark--resolved",
    ]);
    expect(outdated).toEqual([]);
  });

  it("draws a spot comment with a caret at its side", () => {
    const spot = comment({
      id: 3,
      anchor: { ...words.anchor, point: "after" } as never,
    });

    const [mark] = commentMarks([spot], content, "open").drawn;

    expect(mark).toMatchObject({
      className: "review-mark review-mark--pending review-mark--point",
      point: "after",
    });
  });

  it("finds a comment across blocks", () => {
    const across = comment({
      id: 4,
      anchor: {
        v: 1,
        field: "blocks",
        blockId: "b1",
        endBlockId: "b2",
        start: 23,
        end: 6,
        quote: "of code.\nSecond",
        prefix: "",
        suffix: "",
      },
    });

    const [mark] = commentMarks([across], content, "open").drawn;

    expect(mark.range).toEqual({
      field: "blocks",
      blockId: "b1",
      endBlockId: "b2",
      start: 23,
      end: 6,
      exact: true,
    });
    expect(blocksSpanned(content, across.anchor)).toBe(2);
  });

  it("doesn't list a resolved comment as outdated", () => {
    const resolved = { ...words, resolvedAt: "2026-10-27T12:00:00Z" };
    const gone = { blocks: [{ id: "b1", text: "Something else entirely." }] };
    expect(commentMarks([resolved], gone, "open")).toEqual({
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

describe("whole Overview sections", () => {
  const section = comment({
    id: 5,
    field: "nextSteps",
    anchor: { v: 1, field: "nextSteps" },
  });

  it("tells a whole section from a whole block and from text", () => {
    expect(isWholeSection(section.anchor)).toBe(true);
    expect(isWholeSection({ v: 1, field: "blocks", blockId: "b1" })).toBe(
      false,
    );
    expect(
      isWholeSection({
        v: 1,
        field: "overview",
        quote: "loops",
        prefix: "",
        suffix: "",
      }),
    ).toBe(false);
  });

  it("draws no mark for one and never calls it outdated", () => {
    expect(
      commentMarks([section], { nextSteps: [{ text: "" }] }, "open"),
    ).toEqual({ drawn: [], outdated: [] });
  });

  it("names it by its heading", () => {
    const heading = { type: "section", text: "Next Steps" };
    expect(commentSnippet(section, heading)).toBe("Section · “Next Steps”");
    expect(blockLabel("section")).toBe("Section");
  });
});

describe("numberComments", () => {
  it("numbers open comments in the order written", () => {
    const list = [comment({ id: 9 }), comment({ id: 3 }), comment({ id: 5 })];
    expect([...numberComments(list)]).toEqual([
      [3, 1],
      [5, 2],
      [9, 3],
    ]);
  });

  it("closes up when one is resolved, and gives it no number", () => {
    const list = [
      comment({ id: 3 }),
      comment({ id: 5, resolvedAt: "2026-10-27T12:00:00Z" }),
      comment({ id: 9 }),
    ];
    expect([...numberComments(list)]).toEqual([
      [3, 1],
      [9, 2],
    ]);
  });

  it("gives a new, unsaved comment the next number", () => {
    const list = [comment({ id: -2 }), comment({ id: 4 }), comment({ id: -1 })];
    expect([...numberComments(list)]).toEqual([
      [4, 1],
      [-1, 2],
      [-2, 3],
    ]);
  });
});

describe("commentSnippet", () => {
  const words = comment({
    anchor: {
      v: 1,
      field: "blocks",
      blockId: "b1",
      start: 0,
      end: 40,
      quote: "A loop repeats a block of code until done",
      prefix: "",
      suffix: "",
    },
  });
  const block = comment({ anchor: { v: 1, field: "blocks", blockId: "b2" } });

  it("quotes the words, shortened", () => {
    expect(commentSnippet(words, undefined)).toBe(
      "“A loop repeats a block of c…”",
    );
  });

  it("shows a spot as ‸ between the words either side", () => {
    const spot = comment({
      anchor: {
        v: 1,
        field: "blocks",
        start: 6,
        end: 13,
        quote: "repeats",
        prefix: "A loop ",
        suffix: " a block of code until it's done",
        point: "before",
      },
    });

    expect(commentSnippet(spot, undefined, { long: true })).toBe(
      "“A loop ‸repeats a block of code until…”",
    );
  });

  it("says how many blocks a selection across blocks spans", () => {
    const across = comment({
      anchor: {
        v: 1,
        field: "blocks",
        blockId: "b1",
        endBlockId: "b3",
        start: 0,
        end: 3,
        quote: "One\nTwo\nThr",
        prefix: "",
        suffix: "",
      },
    });

    expect(commentSnippet(across, undefined, { blocks: 3 })).toBe(
      "“One Two Thr” · 3 blocks",
    );
  });

  it("names the block and its first words", () => {
    expect(
      commentSnippet(block, {
        type: "quiz-multiple-choice",
        text: "Which loop runs at least once?",
      }),
    ).toBe("Check-in · “Which loop runs at…”");
  });

  it("reads longer for a label", () => {
    expect(commentSnippet(words, undefined, { long: true })).toBe(
      "“A loop repeats a block of code until done”",
    );
  });
});

describe("blocks", () => {
  it("labels BlockNote block types", () => {
    expect(blockLabel("heading")).toBe("Heading");
    expect(blockLabel("numberedListItem")).toBe("List item");
    expect(blockLabel("something-new")).toBe("Block");
    expect(blockLabel(undefined)).toBe("Block");
  });

  it("maps every block id to its type, children included", () => {
    expect([
      ...blockTypes([
        {
          id: "a",
          type: "bulletListItem",
          children: [{ id: "b", type: "paragraph" }],
        },
      ]),
    ]).toEqual([
      ["a", "bulletListItem"],
      ["b", "paragraph"],
    ]);
  });
});

describe("commentTime", () => {
  const now = new Date(2026, 9, 27, 15, 0);

  it("says today, yesterday, or the date", () => {
    expect(commentTime(new Date(2026, 9, 27, 14, 49).toISOString(), now)).toBe(
      "Today, 2:49 PM",
    );
    expect(commentTime(new Date(2026, 9, 26, 9, 5).toISOString(), now)).toBe(
      "Yesterday, 9:05 AM",
    );
    expect(commentTime(new Date(2026, 9, 20, 9, 5).toISOString(), now)).toBe(
      "Oct 20, 9:05 AM",
    );
    expect(commentTime(undefined, now)).toBeNull();
  });
});

describe("decorateMarks focus", () => {
  const range = { blockId: "b1", start: 0, end: 1 } as never;
  const drawn = [
    { id: "comment-1", range, className: "review-mark" },
    { id: "comment-2", range, className: "review-mark" },
  ];

  it.each([
    [
      "lit and focused",
      "comment-1",
      "comment-1",
      "review-mark review-mark--lit review-mark--focus",
    ],
    ["focused only", null, "comment-1", "review-mark review-mark--focus"],
    ["neither", null, null, "review-mark"],
  ])("a mark that is %s", (_n, lit, focused, expected) => {
    const [first, second] = decorateMarks(drawn, lit, null, focused);
    expect(first.className).toBe(expected);
    expect(second.className).toBe("review-mark");
  });
});
