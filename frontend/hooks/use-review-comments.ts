"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  Lesson,
  Review,
  ReviewAnchor,
  ReviewComment,
  ReviewCommentField,
} from "@/types";
import {
  addComment,
  deleteComment,
  editComment,
  getMyReview,
  getOrOpenReview,
  resolveComment,
  type ReviewActionError,
} from "@/lib/requests/reviews";

export type NewComment = {
  field: ReviewCommentField;
  lessonId: number | null;
  anchor: ReviewAnchor;
  body: string;
};

export type CommentOutcome =
  | { ok: true }
  | { ok: false; error: ReviewActionError };

export type OpenOutcome =
  | { ok: true; data: Review }
  | { ok: false; error: ReviewActionError };

const OK: CommentOutcome = { ok: true };
const failed = (error: ReviewActionError) => ({
  ok: false as const,
  error,
});

/** Runs an action, treating a throw (a dropped connection) as "failed" */
async function attempt<T>(
  run: () => Promise<
    { ok: true; data: T } | { ok: false; error: ReviewActionError }
  >,
): Promise<{ ok: true; data: T } | { ok: false; error: ReviewActionError }> {
  try {
    return await run();
  } catch (error) {
    console.error("Review comment action failed", error);
    return { ok: false, error: "failed" };
  }
}

/**
 * The caller's own review of a droplet and its comments (ODY-806). Reads with
 * getMyReview while `enabled`; never opens a review until the first comment is
 * added. Every change shows at once and is rolled back if the server refuses.
 */
export function useReviewComments(
  dropletId: number | undefined,
  enabled: boolean,
) {
  const [review, setReview] = useState<Review | null>(null);
  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<ReviewActionError | null>(null);
  const reviewRef = useRef(review);
  reviewRef.current = review;
  const commentsRef = useRef(comments);
  commentsRef.current = comments;
  // Comments not saved yet have negative ids
  const nextTempId = useRef(-1);
  // Comments added here, which a load that began before they were saved
  // doesn't have
  const addedHere = useRef(new Set<number>());

  // An open in flight, shared by every caller of ensureReview
  const opening = useRef<Promise<OpenOutcome> | null>(null);

  // What's held belongs to one droplet; another starts afresh
  const heldFor = useRef(dropletId);
  useEffect(() => {
    if (heldFor.current === dropletId) return;
    heldFor.current = dropletId;
    reviewRef.current = null;
    opening.current = null;
    setReview(null);
    setComments([]);
    addedHere.current.clear();
  }, [dropletId]);

  useEffect(() => {
    if (!enabled || dropletId == null) return;
    let cancelled = false;
    setIsLoading(true);
    attempt(() => getMyReview(dropletId)).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        // A comment may already have opened the review, and be saving or
        // saved; the load doesn't know about it
        setReview((current) => result.data ?? current);
        setComments((current) => {
          const loaded = result.data?.comments ?? [];
          const ids = new Set(loaded.map((c) => c.id));
          return [
            ...loaded,
            ...current.filter(
              (c) =>
                !ids.has(c.id) && (c.id < 0 || addedHere.current.has(c.id)),
            ),
          ];
        });
        setLoadError(null);
      } else {
        setLoadError(result.error);
      }
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [dropletId, enabled]);

  const replace = (id: number, next: ReviewComment | null) =>
    setComments((current) =>
      next
        ? current.map((c) => (c.id === id ? next : c))
        : current.filter((c) => c.id !== id),
    );

  /** The caller's review, opened on first use; score and comment writes share it */
  const ensureReview = useCallback((): Promise<OpenOutcome> => {
    if (reviewRef.current) {
      return Promise.resolve({ ok: true, data: reviewRef.current });
    }
    if (dropletId == null) return Promise.resolve(failed("not_found"));
    opening.current ??= attempt(() => getOrOpenReview(dropletId)).then(
      (opened): OpenOutcome => {
        opening.current = null;
        if (!opened.ok) return failed(opened.error);
        reviewRef.current = opened.data;
        setReview(opened.data);
        return { ok: true, data: opened.data };
      },
    );
    return opening.current;
  }, [dropletId]);

  const add = useCallback(
    async (input: NewComment): Promise<CommentOutcome> => {
      if (dropletId == null) return failed("not_found");
      const id = nextTempId.current--;
      const lesson =
        input.lessonId !== null ? ({ id: input.lessonId } as Lesson) : null;
      const optimistic: ReviewComment = {
        id,
        field: input.field,
        anchor: input.anchor,
        body: input.body,
        lesson,
        resolvedAt: null,
        createdAt: new Date().toISOString(),
      };
      setComments((current) => [...current, optimistic]);

      // The first comment opens the review
      const opened = await ensureReview();
      if (!opened.ok) {
        replace(id, null);
        return failed(opened.error);
      }
      const current = opened.data;

      const saved = await attempt(() =>
        addComment({
          reviewId: current.id,
          lessonId: input.lessonId,
          field: input.field,
          anchor: input.anchor,
          body: input.body,
        }),
      );
      if (!saved.ok) {
        replace(id, null);
        return failed(saved.error);
      }
      // The write's response has no relations, so the lesson is kept
      addedHere.current.add(saved.data.id);
      replace(id, { ...optimistic, ...saved.data, lesson });
      return OK;
    },
    [dropletId, ensureReview],
  );

  /** Shows `next` for comment `id` until the action settles, else restores it */
  const change = useCallback(
    async (
      id: number,
      next: ReviewComment | null,
      run: () => Promise<
        { ok: true; data: unknown } | { ok: false; error: ReviewActionError }
      >,
    ): Promise<CommentOutcome> => {
      const before = commentsRef.current;
      const index = before.findIndex((c) => c.id === id);
      if (index < 0) return failed("not_found");
      const previous = before[index];
      replace(id, next);

      const result = await attempt(run);
      if (result.ok) return OK;
      setComments((current) => {
        if (next) return current.map((c) => (c.id === id ? previous : c));
        const restored = [...current];
        restored.splice(Math.min(index, restored.length), 0, previous);
        return restored;
      });
      return failed(result.error);
    },
    [],
  );

  const edit = useCallback(
    (id: number, body: string) => {
      const comment = commentsRef.current.find((c) => c.id === id);
      return change(id, comment ? { ...comment, body } : null, () =>
        editComment(id, body),
      );
    },
    [change],
  );

  const remove = useCallback(
    (id: number) => change(id, null, () => deleteComment(id)),
    [change],
  );

  const resolve = useCallback(
    (id: number, resolved = true) => {
      const comment = commentsRef.current.find((c) => c.id === id);
      const resolvedAt = resolved ? new Date().toISOString() : null;
      return change(id, comment ? { ...comment, resolvedAt } : null, () =>
        resolveComment(id, resolved),
      );
    },
    [change],
  );

  return {
    review,
    comments,
    isLoading,
    loadError,
    ensureReview,
    add,
    edit,
    remove,
    resolve,
  };
}
