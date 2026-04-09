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

const HEARTBEAT_INTERVAL = 30_000;
const POLL_INTERVAL = 10_000;

type EditingLockState = {
  isLocked: boolean;
  isOwnLock: boolean;
  lockedBy: LockStatus["lockedBy"];
  isLoading: boolean;
  error: string | null;
};

export function useEditingLock(lessonId: number) {
  const [state, setState] = useState<EditingLockState>({
    isLocked: false,
    isOwnLock: false,
    lockedBy: null,
    isLoading: true,
    error: null,
  });
  const userIdRef = useRef<number | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setTimeout>>();
  const pollRef = useRef<ReturnType<typeof setTimeout>>();
  const mountedRef = useRef(true);

  const release = useCallback(async () => {
    clearTimeout(heartbeatRef.current);
    clearTimeout(pollRef.current);
    const uid = userIdRef.current;
    if (uid) await releaseLessonLock(lessonId, uid);
    setState({
      isLocked: false,
      isOwnLock: false,
      lockedBy: null,
      isLoading: false,
      error: null,
    });
  }, [lessonId]);

  useEffect(() => {
    mountedRef.current = true;

    // Recursive setTimeout prevents stacking when requests are slow
    const startHeartbeat = () => {
      clearTimeout(heartbeatRef.current);
      const tick = async () => {
        const uid = userIdRef.current;
        if (!uid || !mountedRef.current) return;
        const ok = await heartbeatLessonLock(lessonId, uid);
        if (!mountedRef.current) return;
        if (!ok) {
          // Lock was lost — switch to polling
          setState({
            isLocked: true,
            isOwnLock: false,
            lockedBy: null,
            isLoading: false,
            error: null,
          });
          startPolling();
          return;
        }
        heartbeatRef.current = setTimeout(tick, HEARTBEAT_INTERVAL);
      };
      heartbeatRef.current = setTimeout(tick, HEARTBEAT_INTERVAL);
    };

    const startPolling = () => {
      clearTimeout(pollRef.current);
      const tick = async () => {
        if (!mountedRef.current) return;
        const uid = userIdRef.current;
        if (!uid) return;

        const status = await getLessonLockStatus(lessonId);
        if (!mountedRef.current) return;

        if (!status.isLocked) {
          const result = await acquireLessonLock(lessonId, uid);
          if (!mountedRef.current) return;
          if (result.success) {
            setState({
              isLocked: true,
              isOwnLock: true,
              lockedBy: null,
              isLoading: false,
              error: null,
            });
            startHeartbeat();
            return;
          }
        } else {
          // Only update state if lockedBy actually changed
          setState((prev) => {
            if (prev.lockedBy?.id === status.lockedBy?.id) return prev;
            return { ...prev, lockedBy: status.lockedBy };
          });
        }
        pollRef.current = setTimeout(tick, POLL_INTERVAL);
      };
      pollRef.current = setTimeout(tick, POLL_INTERVAL);
    };

    const init = async () => {
      const userId = await getCurrentAuthorizedUserId();
      if (!mountedRef.current) return;
      userIdRef.current = userId;

      if (!userId) {
        setState({
          isLocked: false,
          isOwnLock: false,
          lockedBy: null,
          isLoading: false,
          error: "Could not resolve your user account",
        });
        return;
      }

      const result = await acquireLessonLock(lessonId, userId);
      if (!mountedRef.current) return;

      if (result.success) {
        setState({
          isLocked: true,
          isOwnLock: true,
          lockedBy: null,
          isLoading: false,
          error: null,
        });
        startHeartbeat();
      } else {
        setState({
          isLocked: true,
          isOwnLock: false,
          lockedBy: result.lockedBy ?? null,
          isLoading: false,
          error: result.lockedBy ? null : result.error ?? null,
        });
        startPolling();
      }
    };

    init();

    return () => {
      mountedRef.current = false;
      clearTimeout(heartbeatRef.current);
      clearTimeout(pollRef.current);
      const uid = userIdRef.current;
      if (uid) releaseLessonLock(lessonId, uid);
    };
  }, [lessonId]);

  return { ...state, release };
}
