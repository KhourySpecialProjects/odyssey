import { attachThreads, isEdited, replyTime } from "@/lib/review-threads";
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
