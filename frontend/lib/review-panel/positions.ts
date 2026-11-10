import { resolveAnchor } from "@/lib/anchors/resolve";
import { OUTDATED, type Anchor, type AnchorBlock } from "@/lib/anchors/types";

/** Where a comment or finding sits in its lesson, or that its text is gone */
export type Position = { order: [number, number] } | { outdated: true };

export type PositionItem = {
  /** `c<commentId>` or `f<findingId>` */
  key: string;
  lessonId: number | null;
  anchor: Anchor;
};

/**
 * Positions for items in BlockNote lessons (contents by lesson id). Classic
 * lessons, the Overview and missing lessons get no entry.
 */
export function computePositions(
  items: PositionItem[],
  contents: Record<number, AnchorBlock[]>,
): Record<string, Position> {
  const out: Record<string, Position> = {};
  for (const { key, lessonId, anchor } of items) {
    const blocks = lessonId === null ? undefined : contents[lessonId];
    if (!blocks) continue;
    const range = resolveAnchor({ [anchor.field]: blocks }, anchor);
    if (range === OUTDATED) {
      out[key] = { outdated: true };
      continue;
    }
    const index =
      range.blockId === undefined
        ? 0
        : blocks.findIndex((b) => b.id === range.blockId);
    out[key] = { order: [Math.max(index, 0), range.start] };
  }
  return out;
}

const rank = (p: Position | undefined) => (!p ? 2 : "outdated" in p ? 1 : 0);

/** Reading order, then outdated, then unpositioned items (given order); stable */
export function sortByPosition<T>(
  items: T[],
  keyOf: (item: T) => string,
  positions: Record<string, Position>,
): T[] {
  return items
    .map((item, i) => ({ item, i, p: positions[keyOf(item)] }))
    .sort((a, b) => {
      const byRank = rank(a.p) - rank(b.p);
      if (byRank) return byRank;
      if (a.p && "order" in a.p && b.p && "order" in b.p) {
        return (
          a.p.order[0] - b.p.order[0] ||
          a.p.order[1] - b.p.order[1] ||
          a.i - b.i
        );
      }
      return a.i - b.i;
    })
    .map(({ item }) => item);
}
