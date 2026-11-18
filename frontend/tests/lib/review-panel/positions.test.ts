import { computePositions, sortByPosition } from "@/lib/review-panel/positions";
import type { Anchor, AnchorBlock } from "@/lib/anchors/types";

const blocks: AnchorBlock[] = [
  { id: "a", text: "First block here" },
  { id: "b", text: "Second block with a quote inside" },
  { id: "c", text: "Third" },
];

const anchor = (over: Partial<Anchor>): Anchor => ({
  v: 1,
  field: "blocks",
  ...over,
});

describe("computePositions", () => {
  it("orders found anchors by block index and offset", () => {
    const items = [
      {
        key: "c1",
        lessonId: 1,
        anchor: anchor({ blockId: "b", start: 20, end: 25, quote: "quote" }),
      },
      {
        key: "c2",
        lessonId: 1,
        anchor: anchor({ blockId: "a", start: 6, end: 11, quote: "block" }),
      },
    ];
    expect(computePositions(items, { 1: blocks })).toEqual({
      c1: { order: [1, 20] },
      c2: { order: [0, 6] },
    });
  });

  it("marks a deleted passage outdated", () => {
    const items = [
      {
        key: "f1",
        lessonId: 1,
        anchor: anchor({
          blockId: "a",
          start: 0,
          end: 5,
          quote: "gone away",
          prefix: "zzz",
          suffix: "yyy",
        }),
      },
    ];
    expect(computePositions(items, { 1: blocks })).toEqual({
      f1: { outdated: true },
    });
  });

  it("puts a whole-block anchor at its block's start", () => {
    const items = [
      { key: "c1", lessonId: 1, anchor: anchor({ blockId: "c" }) },
    ];
    expect(computePositions(items, { 1: blocks })).toEqual({
      c1: { order: [2, 0] },
    });
  });

  it("leaves Classic lessons and the Overview with no position", () => {
    const items = [
      {
        key: "c1",
        lessonId: 2,
        anchor: anchor({ quote: "x", start: 0, end: 1 }),
      },
      {
        key: "c2",
        lessonId: null,
        anchor: anchor({ field: "description", quote: "x" }),
      },
    ];
    expect(computePositions(items, { 1: blocks })).toEqual({});
  });
});

describe("sortByPosition", () => {
  const items = [
    { k: "new" },
    { k: "old" },
    { k: "late" },
    { k: "early" },
    { k: "gone" },
  ];
  const positions = {
    late: { order: [2, 0] as [number, number] },
    early: { order: [0, 4] as [number, number] },
    gone: { outdated: true as const },
  };

  it("sorts by position, then outdated, then unpositioned in given order", () => {
    const sorted = sortByPosition(items, (i) => i.k, positions);
    expect(sorted.map((i) => i.k)).toEqual([
      "early",
      "late",
      "gone",
      "new",
      "old",
    ]);
  });

  it("keeps creation order when there are no positions", () => {
    expect(sortByPosition(items, (i) => i.k, {}).map((i) => i.k)).toEqual(
      items.map((i) => i.k),
    );
  });
});
