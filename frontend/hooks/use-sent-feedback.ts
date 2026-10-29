"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Review, ReviewComment } from "@/types";
import {
  getReviewForDroplet,
  markAddressed as markAddressedAction,
  type ReviewActionError,
} from "@/lib/requests/reviews";
import type { CommentOutcome } from "./use-review-comments";

const NONE: ReviewComment[] = [];

/**
 * The feedback a reviewer sent to the authors of a droplet (ODY-807), read
 * with getReviewForDroplet while `enabled`. The server decides what an author
 * may see (never an open review, never anything from AI), so nothing here
 * checks again. Only a sent review shows: once published, the draft is gone.
 * Marking a comment addressed shows at once and is rolled back if refused.
 */
export function useSentFeedback(
  dropletId: number | undefined,
  enabled: boolean,
) {
  const [review, setReview] = useState<Review | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<ReviewActionError | null>(null);
  const reviewRef = useRef(review);
  reviewRef.current = review;

  useEffect(() => {
    if (!enabled || dropletId == null) {
      setReview(null);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    getReviewForDroplet(dropletId)
      .catch((error) => {
        console.error("Loading the review feedback failed", error);
        return { ok: false as const, error: "failed" as const, data: null };
      })
      .then((result) => {
        if (cancelled) return;
        if (result.ok) {
          setReview(result.data?.state === "sent" ? result.data : null);
          setLoadError(null);
        } else {
          setReview(null);
          setLoadError(result.error);
        }
        setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dropletId, enabled]);

  const setAddressedAt = (id: number, addressedAt: string | null) =>
    setReview((current) =>
      current
        ? {
            ...current,
            comments: current.comments?.map((c) =>
              c.id === id ? { ...c, addressedAt } : c,
            ),
          }
        : current,
    );

  const markAddressed = useCallback(
    async (id: number, addressed = true): Promise<CommentOutcome> => {
      const comment = reviewRef.current?.comments?.find((c) => c.id === id);
      if (!comment) return { ok: false, error: "not_found" };
      const previous = comment.addressedAt ?? null;
      setAddressedAt(id, addressed ? new Date().toISOString() : null);

      const result = await markAddressedAction(id, addressed).catch((error) => {
        console.error("Marking a comment addressed failed", error);
        return { ok: false as const, error: "failed" as const };
      });
      if (result.ok) return { ok: true };
      setAddressedAt(id, previous);
      return { ok: false, error: result.error };
    },
    [],
  );

  return {
    review,
    comments: review?.comments ?? NONE,
    isLoading,
    loadError,
    markAddressed,
  };
}
