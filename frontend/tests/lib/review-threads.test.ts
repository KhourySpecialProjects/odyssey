import {
  attachThreads,
  isEdited,
  mapThread,
  replyTime,
  settleReply,
  newRepliesText,
  unseenCount,
  unseenReplies,
} from "@/lib/review-threads";
import type { ReviewComment } from "@/types";

const c = (over: Partial<ReviewComment>) =>
  ({ id: 1, field: "blocks", body: "b", anchor: {}, ...over }) as ReviewComment;

describe("attachThreads", () => {
  const replies = [
    c({ id: 9, parent: { id: 1 }, author: { id: 7 } as never }),
    c({ id: 8, parent: { id: 1 }, author: { id: 5 } as never }),
    c({ id: 10, parent: { id: 99 } }),
  ];
  const [root, copy] = attachThreads(
    [c({ id: 1 }), c({ id: 4, carriedFrom: { id: 1 } })],
    replies,
    7,
  );

  it("shows a copy and its root the same replies, in id order", () => {
    expect(root.replies?.map((r) => r.id)).toEqual([8, 9]);
    expect(copy.replies).toEqual(root.replies);
  });

  it("sets mine from the viewer and ignores replies to other parents", () => {
    expect(root.replies?.map((r) => r.mine)).toEqual([false, true]);
    expect(root.replies?.some((r) => r.id === 10)).toBe(false);
  });
});

describe("isEdited", () => {
  it.each([
    ["2026-01-01T00:00:00.000Z", "2026-01-01T00:00:02.000Z", true],
    ["2026-01-01T00:00:00.000Z", "2026-01-01T00:00:01.000Z", false],
    ["2026-01-01T00:00:00.000Z", "2026-01-01T00:00:00.000Z", false],
  ])("%s -> %s is %s", (createdAt, updatedAt, expected) => {
    expect(isEdited({ createdAt, updatedAt })).toBe(expected);
  });

  it("replyTime is createdAt", () => {
    expect(replyTime({ createdAt: "x" })).toBe("x");
  });
});

describe("settleReply", () => {
  const saved = c({ id: 50, parent: { id: 1 } });

  it("swaps the saving reply in place", () => {
    const out = settleReply([c({ id: -1 }), c({ id: -2 })], -1, saved);
    expect(out.map((r) => r.id)).toEqual([50, -2]);
  });

  it("drops the saving reply when a reload already has the saved one", () => {
    const out = settleReply([c({ id: 50 }), c({ id: -1 })], -1, saved);
    expect(out.map((r) => r.id)).toEqual([50]);
  });

  it("adds the saved reply when a reload dropped the saving one", () => {
    expect(settleReply([], -1, saved).map((r) => r.id)).toEqual([50]);
  });
});

describe("unseen replies", () => {
  const top = (over: Partial<ReviewComment> = {}) =>
    c({
      id: 1,
      replies: [
        c({ id: 5 }),
        c({ id: 6, mine: true }),
        c({ id: -1 }),
        c({ id: 7 }),
      ],
      ...over,
    });

  it("counts replies by others that are saved and not seen", () => {
    expect(unseenReplies(top(), new Set([5])).map((r) => r.id)).toEqual([7]);
    expect(unseenReplies(top(), new Set()).map((r) => r.id)).toEqual([5, 7]);
  });

  it("counts none on a resolved comment", () => {
    const resolved = top({ resolvedAt: "2026-11-04" });
    expect(unseenReplies(resolved, new Set())).toEqual([]);
  });

  it("totals the unseen replies of the comments", () => {
    const list = [top(), top({ id: 2, replies: [c({ id: 6, mine: true })] })];
    expect(unseenCount(list, new Set())).toBe(2);
  });

  it("counts none with no seen state to compare against", () => {
    expect(unseenReplies(top(), null)).toEqual([]);
    expect(unseenCount([top()], null)).toBe(0);
  });

  it.each([
    [1, "1 new reply"],
    [3, "3 new replies"],
  ])("words %i as %s", (n, text) => expect(newRepliesText(n)).toBe(text));
});

describe("mapThread", () => {
  it("changes every comment of the root, and no other", () => {
    const out = mapThread(
      [c({ id: 1 }), c({ id: 4, carriedFrom: { id: 1 } }), c({ id: 2 })],
      1,
      (rs) => [...rs, c({ id: 9 })],
    );
    expect(out.map((x) => x.replies?.length)).toEqual([1, 1, undefined]);
  });
});
