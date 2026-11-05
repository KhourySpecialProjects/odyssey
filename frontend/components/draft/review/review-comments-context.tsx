"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useReviewComments } from "@/hooks/use-review-comments";
import { useSentFeedback } from "@/hooks/use-sent-feedback";
import { useSeenReplies } from "@/hooks/use-seen-replies";
import { useThreadRefresh } from "@/hooks/use-thread-refresh";

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

type ThreadSeen = {
  /** Checks for new replies now */
  check: () => void;
  /** Null outside a `ThreadRefresh`: nothing is tracked, so nothing is unseen */
  seen: ReadonlySet<number> | null;
  markSeen: (ids: readonly number[]) => void;
};

const NO_SEEN: ThreadSeen = {
  check: () => {},
  seen: null,
  markSeen: () => {},
};

const ThreadSeenContext = createContext<ThreadSeen>(NO_SEEN);

/** Polls the reply stamp for the layout, reloads on a change, and shares seen replies (ODY-881). */
export function ThreadRefresh({
  dropletId,
  children,
}: {
  dropletId: number;
  children: ReactNode;
}) {
  const comments = useSharedReviewComments();
  const sent = useSharedSentFeedback();
  const { check } = useThreadRefresh(dropletId, !!sent?.review, () => {
    comments?.reload();
    sent?.reload();
  });
  const { seen, markSeen } = useSeenReplies(dropletId);
  const value = useMemo(
    () => ({ check, seen, markSeen }),
    [check, seen, markSeen],
  );
  return (
    <ThreadSeenContext.Provider value={value}>
      {children}
    </ThreadSeenContext.Provider>
  );
}

/** The layout's check and seen replies; inert outside a layout */
export const useThreadSeen = () => useContext(ThreadSeenContext);

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
