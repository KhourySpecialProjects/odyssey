"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useReviewComments } from "@/hooks/use-review-comments";
import { useSentFeedback } from "@/hooks/use-sent-feedback";

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

type SentFeedback = ReturnType<typeof useSentFeedback> & { enabled: boolean };

const SentFeedbackContext = createContext<SentFeedback | null>(null);

/**
 * The feedback sent to the authors, loaded once by the draft layout for an
 * author or a non-author reviewer (ODY-807, ODY-881).
 */
export function SentFeedbackProvider({
  dropletId,
  enabled,
  isAuthor,
  children,
}: {
  dropletId: number;
  enabled: boolean;
  isAuthor: boolean;
  children: ReactNode;
}) {
  const value = useSentFeedback(dropletId, enabled, { isAuthor });
  return (
    <SentFeedbackContext.Provider value={{ ...value, enabled }}>
      {children}
    </SentFeedbackContext.Provider>
  );
}

/** The layout's sent feedback, or null outside a layout that reads it */
export function useSharedSentFeedback(): SentFeedback | null {
  const shared = useContext(SentFeedbackContext);
  return shared?.enabled ? shared : null;
}

/** The sent feedback for a page: the layout's when it loads it, else its own */
export function useDropletSentFeedback(
  dropletId: number | undefined,
  enabled: boolean,
  isAuthor: boolean,
) {
  const shared = useSharedSentFeedback();
  const own = useSentFeedback(dropletId, enabled && !shared, { isAuthor });
  return shared ?? own;
}
