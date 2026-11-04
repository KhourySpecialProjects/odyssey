import type { ReviewComment } from "@/types";
import type { ReviewActionError } from "@/lib/requests/reviews";

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

/** Applies `change` to the replies of every comment in the root's thread. */
export function mapThread(
  comments: ReviewComment[],
  root: number,
  change: (replies: ReviewComment[]) => ReviewComment[],
): ReviewComment[] {
  return comments.map((c) =>
    rootId(c) === root ? { ...c, replies: change(c.replies ?? []) } : c,
  );
}

/** Swaps a saving reply for its saved row, adding it only if a reload hasn't. */
export function settleReply(
  replies: ReviewComment[],
  tempId: number,
  saved: ReviewComment,
): ReviewComment[] {
  const at = replies.findIndex((r) => r.id === tempId);
  const rest = replies.filter((r) => r.id !== tempId);
  if (rest.some((r) => r.id === saved.id)) return rest;
  const next = { ...saved, mine: true };
  if (at < 0) return [...rest, next];
  return [...rest.slice(0, at), next, ...rest.slice(at)];
}

/** Replies posted from this tab, by id, with the root each belongs to. */
export type PostedReplies = Map<number, { root: number; reply: ReviewComment }>;

/** Puts back posted replies a stale read lacks; saving ones (negative ids) last. */
export function mergePosted(
  comments: ReviewComment[],
  posted: PostedReplies,
): ReviewComment[] {
  if (posted.size === 0) return comments;
  return comments.map((c) => {
    const have = new Set((c.replies ?? []).map((r) => r.id));
    const missing = [...posted.entries()]
      .filter(([id, p]) => p.root === rootId(c) && !have.has(id))
      .map(([, p]) => p.reply)
      .sort((a, b) => (a.id < 0 ? 1 : 0) - (b.id < 0 ? 1 : 0) || a.id - b.id);
    return missing.length
      ? { ...c, replies: [...(c.replies ?? []), ...missing] }
      : c;
  });
}

/** A reply shown before it is saved; its negative id marks it as saving. */
export function savingReply(
  target: ReviewComment,
  tempId: number,
  body: string,
): ReviewComment {
  return {
    id: tempId,
    field: target.field,
    anchor: target.anchor,
    body,
    author: null,
    mine: true,
    createdAt: new Date().toISOString(),
    parent: { id: rootId(target) },
  };
}

type ChangeResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ReviewActionError };

/** Finds a reply by id among the loaded comments, with its thread's root. */
export function findReply(comments: ReviewComment[], id: number) {
  for (const c of comments) {
    const reply = c.replies?.find((r) => r.id === id);
    if (reply) return { root: rootId(c), reply };
  }
  return null;
}

/** Puts a reply back in its id place, replacing any copy of it. */
const restoreReply = (replies: ReviewComment[], previous: ReviewComment) =>
  [...replies.filter((r) => r.id !== previous.id), previous].sort(
    (a, b) => (a.id < 0 ? 1 : 0) - (b.id < 0 ? 1 : 0) || a.id - b.id,
  );

/**
 * Shows an edit (`next` returns the reply) or delete (returns null) of a reply
 * at once, rolls it back if refused, and reloads on a conflict (ODY-881).
 */
export async function changeReply<T>({
  comments,
  id,
  next,
  run,
  posted,
  setThread,
  reload,
  invalidateLoads,
}: {
  comments: ReviewComment[];
  id: number;
  next: (previous: ReviewComment) => ReviewComment | null;
  run: () => Promise<ChangeResult<T>>;
  posted: PostedReplies;
  setThread: (
    root: number,
    change: (replies: ReviewComment[]) => ReviewComment[],
  ) => void;
  reload: () => void;
  /** Makes a read already in flight stale, so it can't undo this change */
  invalidateLoads: () => void;
}): Promise<{ ok: true } | { ok: false; error: ReviewActionError }> {
  const found = findReply(comments, id);
  if (!found) return { ok: false, error: "not_found" };
  const { root, reply: previous } = found;
  invalidateLoads();
  const optimistic = next(previous);
  const wasPosted = posted.get(id);
  if (!optimistic) posted.delete(id);
  else if (wasPosted) posted.set(id, { root, reply: optimistic });
  setThread(root, (rs) =>
    optimistic
      ? rs.map((r) => (r.id === id ? optimistic : r))
      : rs.filter((r) => r.id !== id),
  );

  const result = await run().catch((error) => {
    console.error("Changing a reply failed", error);
    return { ok: false as const, error: "failed" as const };
  });
  if (!result.ok) {
    if (wasPosted) posted.set(id, wasPosted);
    setThread(root, (rs) => restoreReply(rs, previous));
    if (result.error === "conflict") reload();
    return { ok: false, error: result.error };
  }
  invalidateLoads();
  if (optimistic) {
    const saved = { ...optimistic, ...(result.data as object), mine: true };
    if (wasPosted) posted.set(id, { root, reply: saved });
    setThread(root, (rs) => rs.map((r) => (r.id === id ? saved : r)));
  }
  return { ok: true };
}
