"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  acquireLessonLock,
  releaseLessonLock,
  heartbeatLessonLock,
  getLessonLockStatus,
  getCurrentAuthorizedUserId,
  type LockStatus,
} from "@/lib/requests/lesson-lock";
import { REVIEW_FROZEN_ERROR } from "@/lib/review-roles";

const HEARTBEAT_INTERVAL = 30_000;
const POLL_INTERVAL = 10_000;
// Well under the 60 s lock TTL.
const REFRESH_TIMEOUT = 15_000;

type LockHolder = NonNullable<LockStatus["lockedBy"]>;

/**
 * Loads the lesson's latest saved content into the editor. Resolves true when
 * the editor now shows it, false (or throws) when it could not be loaded.
 */
export type RefreshLesson = () => Promise<boolean>;

type EditingLockState = {
  isLocked: boolean;
  isOwnLock: boolean;
  lockedBy: LockStatus["lockedBy"];
  isLoading: boolean;
  error: string | null;
  /** The lock is held and the latest content is loading; still read-only. */
  isRefreshing: boolean;
  /** This lock was taken after the page loaded, so the content was refreshed. */
  tookOver: boolean;
  /** Who held the lock before, when known. Meaningful only while tookOver. */
  tookOverFrom: LockHolder | null;
  /** The lesson's droplet is in review. */
  inReview: boolean;
  /** The caller reviews it (never an author). Meaningful only while inReview. */
  isReviewer: boolean;
  /** The review ended while this tab was open; reload to edit the new copy. */
  reviewEnded: boolean;
};

type Actions = {
  startEditing: () => Promise<void>;
  stopEditing: () => Promise<void>;
  markFrozen: () => Promise<void>;
};

const INITIAL_STATE: EditingLockState = {
  isLocked: false,
  isOwnLock: false,
  lockedBy: null,
  isLoading: true,
  error: null,
  isRefreshing: false,
  tookOver: false,
  tookOverFrom: null,
  inReview: false,
  isReviewer: false,
  reviewEnded: false,
};

/**
 * @param refresh Called after every lock gained once the page has loaded (poll
 * takeover, a reviewer's Edit, taking back a lost lock). The tab stays
 * read-only until it resolves true, so it never edits a stale copy. Only the
 * first acquire on mount skips it: that content was rendered moments ago.
 */
export function useEditingLock(lessonId: number, refresh: RefreshLesson) {
  const [state, setState] = useState<EditingLockState>(INITIAL_STATE);
  const userIdRef = useRef<number | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setTimeout>>();
  const pollRef = useRef<ReturnType<typeof setTimeout>>();
  const mountedRef = useRef(true);
  const holdsLockRef = useRef(false);
  const editRequestedRef = useRef(false);
  const reviewEndedRef = useRef(false);
  const reviewRef = useRef({ inReview: false, isReviewer: false });
  // False until the server has reported a review state at least once. While
  // unknown (the lookup failed), nothing takes the lock on its own.
  const reviewKnownRef = useRef(false);
  const actionsRef = useRef<Actions | null>(null);
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  // The last other editor seen holding the lock; reported after a takeover.
  const lastHolderRef = useRef<LockHolder | null>(null);
  // The acquire-and-refresh that is running, if any.
  const takeoverRef = useRef<Promise<void> | null>(null);

  const release = useCallback(async () => {
    clearTimeout(heartbeatRef.current);
    clearTimeout(pollRef.current);
    holdsLockRef.current = false;
    const uid = userIdRef.current;
    if (uid) await releaseLessonLock(lessonId);
    setState((prev) => ({
      ...prev,
      isLocked: false,
      isOwnLock: false,
      lockedBy: null,
      isLoading: false,
      error: null,
    }));
  }, [lessonId]);

  useEffect(() => {
    mountedRef.current = true;
    holdsLockRef.current = false;
    editRequestedRef.current = false;
    reviewEndedRef.current = false;
    reviewRef.current = { inReview: false, isReviewer: false };
    reviewKnownRef.current = false;
    lastHolderRef.current = null;
    takeoverRef.current = null;

    // Recursive setTimeout prevents stacking when requests are slow
    const startHeartbeat = () => {
      clearTimeout(heartbeatRef.current);
      const tick = async () => {
        try {
          const uid = userIdRef.current;
          if (!uid || !mountedRef.current || !holdsLockRef.current) return;
          const ok = await heartbeatLessonLock(lessonId);
          if (!mountedRef.current || !holdsLockRef.current) return;
          if (!ok) {
            // Lock was lost. The poll loop keeps running and takes it back
            // when it is free (and nothing forbids it).
            holdsLockRef.current = false;
            setState((prev) => ({
              ...prev,
              isLocked: true,
              isOwnLock: false,
              lockedBy: null,
              isLoading: false,
              error: null,
            }));
            return;
          }
          heartbeatRef.current = setTimeout(tick, HEARTBEAT_INTERVAL);
        } catch {
          // Server action failed (network error, server restart, etc.)
          // Schedule a retry instead of leaving an unhandled rejection
          if (mountedRef.current && holdsLockRef.current) {
            heartbeatRef.current = setTimeout(tick, HEARTBEAT_INTERVAL);
          }
        }
      };
      heartbeatRef.current = setTimeout(tick, HEARTBEAT_INTERVAL);
    };

    const gainLock = (takeover?: { from: LockHolder | null }) => {
      holdsLockRef.current = true;
      lastHolderRef.current = null;
      setState((prev) => ({
        ...prev,
        isLocked: true,
        isOwnLock: true,
        lockedBy: null,
        isLoading: false,
        error: null,
        isRefreshing: false,
        tookOver: !!takeover,
        tookOverFrom: takeover?.from ?? null,
      }));
      startHeartbeat();
    };

    /** Stops the heartbeat and releases a lock this tab holds. */
    const dropLock = async () => {
      clearTimeout(heartbeatRef.current);
      const held = holdsLockRef.current;
      holdsLockRef.current = false;
      if (mountedRef.current) {
        setState((prev) => ({
          ...prev,
          isLocked: false,
          isOwnLock: false,
          lockedBy: null,
          isLoading: false,
          isRefreshing: false,
        }));
      }
      if (held) {
        try {
          await releaseLessonLock(lessonId);
        } catch {
          // The lock expires on its own after 60 s without a heartbeat.
        }
      }
    };

    /**
     * Runs after the server granted the lock to a tab whose content may be old.
     * The lock is held (and kept alive) while the latest content loads, so no
     * one else can write in between, but the tab stays read-only until the
     * refresh succeeds. If it fails, the lock is released and the next poll
     * tries again. Returns true when the tab became editable.
     */
    const takeOver = async (): Promise<boolean> => {
      const from = lastHolderRef.current;
      holdsLockRef.current = true;
      startHeartbeat();
      setState((prev) => ({
        ...prev,
        isLocked: true,
        isOwnLock: false,
        lockedBy: null,
        isLoading: false,
        error: null,
        isRefreshing: true,
      }));

      // A refresh that never settles must not hold the lock (the heartbeat
      // keeps it alive) or stall the poll: after the timeout it counts as failed.
      let refreshed = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        refreshed =
          (await Promise.race([
            refreshRef.current(),
            new Promise<boolean>((resolve) => {
              timer = setTimeout(() => resolve(false), REFRESH_TIMEOUT);
            }),
          ])) === true;
      } catch {
        refreshed = false;
      } finally {
        clearTimeout(timer);
      }
      if (!mountedRef.current) return false;

      // The lock was dropped meanwhile (lost heartbeat, frozen, review ended).
      if (!holdsLockRef.current) {
        setState((prev) => ({ ...prev, isRefreshing: false }));
        return false;
      }
      const { inReview, isReviewer } = reviewRef.current;
      if (!refreshed || (inReview && !isReviewer) || reviewEndedRef.current) {
        await dropLock();
        if (!refreshed && mountedRef.current) {
          setState((prev) => ({
            ...prev,
            error: "Couldn't load the latest version of this lesson.",
          }));
        }
        return false;
      }
      gainLock({ from });
      return true;
    };

    /**
     * Acquires the lock for a tab that is already open and, on success, runs
     * the takeover. Only one runs at a time: the poll and the Edit button both
     * join the one in flight, so a double click can't refresh (and remount the
     * editor over the user's work) twice, or drop a lock the first run holds.
     */
    const tryTakeOver = (): Promise<void> => {
      if (takeoverRef.current) return takeoverRef.current;
      const run = (async () => {
        const result = await acquireLessonLock(lessonId);
        if (!mountedRef.current) return;
        if (result.success) {
          await takeOver();
        } else if (result.error === REVIEW_FROZEN_ERROR) {
          editRequestedRef.current = false;
          applyReview({ inReview: true, isReviewer: false });
        } else {
          // Refused (another editor won the race): show who holds it.
          if (result.lockedBy) lastHolderRef.current = result.lockedBy;
          setState((prev) => ({
            ...prev,
            isLocked: true,
            lockedBy: result.lockedBy ?? prev.lockedBy,
            isLoading: false,
          }));
        }
      })().finally(() => {
        if (takeoverRef.current === run) takeoverRef.current = null;
      });
      takeoverRef.current = run;
      return run;
    };

    /** Applies a review state from the server. A null review keeps the old one. */
    const applyReview = (review: LockStatus["review"] | undefined) => {
      if (!review) return;
      reviewKnownRef.current = true;
      const wasInReview = reviewRef.current.inReview;
      reviewRef.current = {
        inReview: review.inReview,
        isReviewer: review.isReviewer,
      };
      if (wasInReview && !review.inReview) {
        reviewEndedRef.current = true;
        editRequestedRef.current = false;
      }
      setState((prev) => ({
        ...prev,
        inReview: review.inReview,
        isReviewer: review.isReviewer,
        reviewEnded: reviewEndedRef.current,
      }));
    };

    const startPolling = () => {
      clearTimeout(pollRef.current);
      const tick = async () => {
        try {
          if (!mountedRef.current) return;
          const uid = userIdRef.current;
          if (!uid) return;

          const status = await getLessonLockStatus(lessonId);
          if (!mountedRef.current) return;
          applyReview(status.review);
          if (reviewKnownRef.current) {
            setState((prev) =>
              prev.isLoading ? { ...prev, isLoading: false } : prev,
            );
          }

          const { inReview, isReviewer } = reviewRef.current;
          const frozen = inReview && !isReviewer;

          if (holdsLockRef.current) {
            if (frozen || reviewEndedRef.current) await dropLock();
          } else {
            const canAutoAcquire =
              reviewKnownRef.current && !inReview && !reviewEndedRef.current;
            const canReviewerAcquire =
              inReview && isReviewer && editRequestedRef.current;
            if (!status.isLocked && (canAutoAcquire || canReviewerAcquire)) {
              await tryTakeOver();
              if (!mountedRef.current) return;
            } else if (status.isLocked) {
              if (status.lockedBy) lastHolderRef.current = status.lockedBy;
              // Only update state if lockedBy actually changed
              setState((prev) => {
                if (prev.lockedBy?.id === status.lockedBy?.id) return prev;
                return { ...prev, lockedBy: status.lockedBy };
              });
            }
          }
        } catch {
          // Server action failed — retry on next interval
        }
        if (mountedRef.current) {
          pollRef.current = setTimeout(tick, POLL_INTERVAL);
        }
      };
      pollRef.current = setTimeout(tick, POLL_INTERVAL);
    };

    actionsRef.current = {
      async startEditing() {
        const { inReview, isReviewer } = reviewRef.current;
        if (!inReview || !isReviewer || reviewEndedRef.current) return;
        editRequestedRef.current = true;
        if (takeoverRef.current) return takeoverRef.current;
        if (holdsLockRef.current) return;
        await tryTakeOver();
      },
      async stopEditing() {
        editRequestedRef.current = false;
        if (holdsLockRef.current) await dropLock();
      },
      async markFrozen() {
        editRequestedRef.current = false;
        reviewRef.current = { inReview: true, isReviewer: false };
        setState((prev) => ({ ...prev, inReview: true, isReviewer: false }));
        if (holdsLockRef.current) await dropLock();
      },
    };

    const init = async () => {
      try {
        const userId = await getCurrentAuthorizedUserId();
        if (!mountedRef.current) return;
        userIdRef.current = userId;

        if (!userId) {
          setState((prev) => ({
            ...prev,
            isLocked: false,
            isOwnLock: false,
            lockedBy: null,
            isLoading: false,
            error: "Could not resolve your user account",
          }));
          return;
        }

        const status = await getLessonLockStatus(lessonId);
        if (!mountedRef.current) return;
        applyReview(status.review);

        if (!reviewKnownRef.current) {
          // The review lookup failed. Don't take the lock blind: stay
          // read-only and let the next poll try again.
          setState((prev) => ({
            ...prev,
            isLocked: status.isLocked,
            lockedBy: status.lockedBy,
          }));
          startPolling();
          return;
        }

        if (reviewRef.current.inReview) {
          // In review: read-only, no lock. A reviewer takes it with Edit.
          setState((prev) => ({
            ...prev,
            isLocked: status.isLocked,
            isOwnLock: false,
            lockedBy: status.lockedBy,
            isLoading: false,
            error: null,
          }));
          startPolling();
          return;
        }

        const result = await acquireLessonLock(lessonId);
        if (!mountedRef.current) return;

        if (result.success) {
          gainLock();
        } else if (result.error === REVIEW_FROZEN_ERROR) {
          applyReview({ inReview: true, isReviewer: false });
          setState((prev) => ({ ...prev, isLoading: false, error: null }));
        } else {
          if (result.lockedBy) lastHolderRef.current = result.lockedBy;
          setState((prev) => ({
            ...prev,
            isLocked: true,
            isOwnLock: false,
            lockedBy: result.lockedBy ?? null,
            isLoading: false,
            error: result.lockedBy ? null : result.error ?? null,
          }));
        }
        startPolling();
      } catch {
        if (mountedRef.current) {
          setState((prev) => ({
            ...prev,
            isLocked: false,
            isOwnLock: false,
            lockedBy: null,
            isLoading: false,
            error: "Failed to initialize editing lock",
          }));
        }
      }
    };

    init();

    return () => {
      mountedRef.current = false;
      actionsRef.current = null;
      clearTimeout(heartbeatRef.current);
      clearTimeout(pollRef.current);
      const uid = userIdRef.current;
      if (uid) releaseLessonLock(lessonId).catch(() => {});
    };
  }, [lessonId]);

  const startEditing = useCallback(
    () => actionsRef.current?.startEditing() ?? Promise.resolve(),
    [],
  );
  const stopEditing = useCallback(
    () => actionsRef.current?.stopEditing() ?? Promise.resolve(),
    [],
  );
  const markFrozen = useCallback(
    () => actionsRef.current?.markFrozen() ?? Promise.resolve(),
    [],
  );

  return { ...state, release, startEditing, stopEditing, markFrozen };
}
