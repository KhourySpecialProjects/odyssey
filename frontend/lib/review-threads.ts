import type { ReviewComment } from "@/types";

/** The comment as first written: a carried copy's `carriedFrom`, else itself. */
export const rootId = (c: Pick<ReviewComment, "id" | "carriedFrom">) =>
  c.carriedFrom?.id ?? c.id;

/** Gives each top-level comment its root's replies, in id order. */
export function attachThreads(
  tops: ReviewComment[],
  replies: ReviewComment[],
  viewerId: number,
): ReviewComment[] {
  const byRoot = new Map<number, ReviewComment[]>();
  for (const r of [...replies].sort((a, b) => a.id - b.id)) {
    const parentId = r.parent?.id;
    if (parentId === undefined) continue;
    const list = byRoot.get(parentId) ?? [];
    list.push({ ...r, mine: r.author?.id === viewerId });
    byRoot.set(parentId, list);
  }
  return tops.map((top) => ({
    ...top,
    replies: byRoot.get(rootId(top)) ?? [],
  }));
}

export const replyTime = (r: Pick<ReviewComment, "createdAt">) => r.createdAt;

/** A reply is edited when it was updated more than 1 s after it was created. */
export function isEdited(r: Pick<ReviewComment, "createdAt" | "updatedAt">) {
  if (!r.createdAt || !r.updatedAt) return false;
  return Date.parse(r.updatedAt) - Date.parse(r.createdAt) > 1000;
}
