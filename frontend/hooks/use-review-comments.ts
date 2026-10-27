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

const OK: CommentOutcome = { ok: true };
const failed = (error: ReviewActionError): CommentOutcome => ({
  ok: false,
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

  useEffect(() => {
    if (!enabled || dropletId == null) return;
    let cancelled = false;
    setIsLoading(true);
    attempt(() => getMyReview(dropletId)).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setReview(result.data);
        setComments(result.data?.comments ?? []);
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
      let current = reviewRef.current;
      if (!current) {
        const opened = await attempt(() => getOrOpenReview(dropletId));
        if (!opened.ok) {
          replace(id, null);
          return failed(opened.error);
        }
        current = opened.data;
        reviewRef.current = current;
        setReview(current);
      }

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
      replace(id, { ...optimistic, ...saved.data, lesson });
      return OK;
    },
    [dropletId],
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
    add,
    edit,
    remove,
    resolve,
  };
}
