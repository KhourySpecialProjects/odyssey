"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useReviewComments } from "@/hooks/use-review-comments";

type ReviewComments = ReturnType<typeof useReviewComments> & {
  enabled: boolean;
};

const ReviewCommentsContext = createContext<ReviewComments | null>(null);

/**
 * The reviewer's comments on a draft, loaded once by the draft layout
 * (ODY-806, Task 9), so the sidebar's counts follow the comments made on the
 * lesson or Overview beside it.
 */
export function ReviewCommentsProvider({
  dropletId,
  enabled,
  children,
}: {
  dropletId: number;
  enabled: boolean;
  children: ReactNode;
}) {
  const value = useReviewComments(dropletId, enabled);
  return (
    <ReviewCommentsContext.Provider value={{ ...value, enabled }}>
      {children}
    </ReviewCommentsContext.Provider>
  );
}

/** The layout's comments, or null outside a reviewing layout */
export function useSharedReviewComments(): ReviewComments | null {
  const shared = useContext(ReviewCommentsContext);
  return shared?.enabled ? shared : null;
}

/**
 * The reviewer's comments for a page: the layout's when it loads them, else
 * the page's own (when the droplet went into review after the page loaded,
 * or with no layout at all).
 */
export function useDropletReviewComments(
  dropletId: number | undefined,
  enabled: boolean,
) {
  const shared = useSharedReviewComments();
  const own = useReviewComments(dropletId, enabled && !shared);
  return shared ?? own;
}
