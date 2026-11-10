"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Review, ReviewComment } from "@/types";
import {
  deleteReply,
  editReply as editReplyAction,
  getReviewForDroplet,
  replyToComment,
  type ReviewActionError,
} from "@/lib/requests/reviews";
import {
  changeReply,
  mapThread,
  mergePosted,
  prunePosted,
  rootId,
  savingReply,
  settleReply,
  type PostedReplies,
} from "@/lib/review-threads";
import type { CommentOutcome } from "./use-review-comments";

const NONE: ReviewComment[] = [];

/**
 * The feedback a reviewer sent to the authors of a droplet (ODY-807), read
 * with getReviewForDroplet while `enabled`. The server decides what an author
 * may see (never an open review, never anything from AI), so nothing here
 * checks again. Only a sent review shows: once published, the draft is gone.
 * Authors and reviewers answer by replying (ODY-881).
 */
export function useSentFeedback(
  dropletId: number | undefined,
  enabled: boolean,
  { isAuthor }: { isAuthor: boolean },
) {
  const [review, setReview] = useState<Review | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<ReviewActionError | null>(null);
  const reviewRef = useRef(review);
  reviewRef.current = review;

  // A newer load, or leaving the page, makes an older one stale
  const loadToken = useRef(0);
  const nextTempId = useRef(-1);
  const activeLoad = useRef<number | null>(null);
  // Returns whether a load in flight was dropped
  const invalidateLoads = useCallback(() => {
    const dropped = activeLoad.current === loadToken.current;
    loadToken.current++;
    return dropped;
  }, []);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  // Replies posted from this tab, which a read that began earlier lacks
  const posted = useRef<PostedReplies>(new Map());
  useEffect(() => {
    posted.current.clear();
  }, [dropletId]);

  const load = useCallback(async () => {
    if (dropletId == null || !enabledRef.current) return;
    const token = ++loadToken.current;
    activeLoad.current = token;
    const result = await getReviewForDroplet(dropletId).catch((error) => {
      // A page left mid-load drops its request; that's no failure
      if (token === loadToken.current) {
        console.error("Loading the review feedback failed", error);
      }
      return { ok: false as const, error: "failed" as const, data: null };
    });
    if (activeLoad.current === token) activeLoad.current = null;
    if (token !== loadToken.current) return;
    if (result.ok) {
      const data = result.data?.state === "sent" ? result.data : null;
      prunePosted(data?.comments ?? [], posted.current, token);
      setReview(
        data?.comments
          ? { ...data, comments: mergePosted(data.comments, posted.current) }
          : data,
      );
      setLoadError(null);
    } else {
      // A failed reload keeps what is shown
      setLoadError(result.error);
    }
    setIsLoading(false);
  }, [dropletId]);

  useEffect(() => {
    if (!enabled || dropletId == null) {
      setReview(null);
      return;
    }
    setIsLoading(true);
    load();
    return () => {
      loadToken.current++;
    };
  }, [dropletId, enabled, load]);

  const setThread = (root: number, change: Parameters<typeof mapThread>[2]) =>
    setReview((current) =>
      current?.comments
        ? { ...current, comments: mapThread(current.comments, root, change) }
        : current,
    );

  const reply = useCallback(
    async (id: number, body: string): Promise<CommentOutcome> => {
      const target = reviewRef.current?.comments?.find((c) => c.id === id);
      if (!target) return { ok: false, error: "not_found" };
      const root = rootId(target);
      const tempId = nextTempId.current--;
      const saving = savingReply(target, tempId, body);
      posted.current.set(tempId, { root, reply: saving });
      setThread(root, (rs) => [...rs, saving]);

      const result = await replyToComment(id, body).catch((error) => {
        console.error("Replying to a comment failed", error);
        return { ok: false as const, error: "failed" as const, data: null };
      });
      posted.current.delete(tempId);
      if (!result.ok) {
        setThread(root, (rs) => rs.filter((r) => r.id !== tempId));
        return { ok: false, error: result.error };
      }
      posted.current.set(result.data.id, {
        root,
        reply: { ...result.data, mine: true },
        after: loadToken.current,
      });
      setThread(root, (rs) => settleReply(rs, tempId, result.data));
      return { ok: true };
    },
    [],
  );

  const editReply = useCallback(
    (id: number, body: string) =>
      changeReply({
        comments: reviewRef.current?.comments ?? NONE,
        id,
        next: (r) => ({ ...r, body, updatedAt: new Date().toISOString() }),
        run: () => editReplyAction(id, body),
        posted: posted.current,
        setThread,
        reload: load,
        invalidateLoads,
      }),
    [load, invalidateLoads],
  );

  const removeReply = useCallback(
    (id: number) =>
      changeReply({
        comments: reviewRef.current?.comments ?? NONE,
        id,
        next: () => null,
        run: () => deleteReply(id),
        posted: posted.current,
        setThread,
        reload: load,
        invalidateLoads,
      }),
    [load, invalidateLoads],
  );

  return {
    review,
    comments: review?.comments ?? NONE,
    isLoading,
    loadError,
    canAddress: isAuthor,
    reply,
    editReply,
    removeReply,
    replyEdits: useMemo(
      () => ({ edit: editReply, remove: removeReply }),
      [editReply, removeReply],
    ),
    reload: load,
  };
}
