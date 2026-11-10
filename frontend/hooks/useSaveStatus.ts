"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * idle     nothing changed yet
 * pending  an edit is waiting for the autosave debounce
 * saving   a save is in flight
 * saved    the last save succeeded and nothing newer is waiting
 * failed   the last save failed; retry() sends it again
 * frozen   the server refused it because the droplet is in review (not a failure)
 */
export type SaveStatus =
  | "idle"
  | "pending"
  | "saving"
  | "saved"
  | "failed"
  | "frozen";

/**
 * Tracks the autosave state for the toolbar indicator and warns before the tab
 * closes while changes are unsent. Call markPending() on each edit, begin()
 * when a save starts, then succeed()/fail()/freeze() with the id begin() gave.
 */
export function useSaveStatus() {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const statusRef = useRef<SaveStatus>("idle");
  const editsRef = useRef(0);
  const saveIdRef = useRef(0);
  const retryRef = useRef<(() => void) | null>(null);
  // begin() records how many edits the save covers.
  const coveredRef = useRef(0);

  const update = useCallback((next: SaveStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const markPending = useCallback(() => {
    editsRef.current += 1;
    update("pending");
  }, [update]);

  const begin = useCallback(() => {
    saveIdRef.current += 1;
    coveredRef.current = editsRef.current;
    update("saving");
    return saveIdRef.current;
  }, [update]);

  const succeed = useCallback(
    (id: number) => {
      // A newer save started meanwhile: it reports the outcome.
      if (id !== saveIdRef.current) return;
      retryRef.current = null;
      update(editsRef.current > coveredRef.current ? "pending" : "saved");
    },
    [update],
  );

  const fail = useCallback(
    (id: number, retry: () => void) => {
      if (id !== saveIdRef.current) return;
      retryRef.current = retry;
      update("failed");
    },
    [update],
  );

  const freeze = useCallback(() => {
    retryRef.current = null;
    update("frozen");
  }, [update]);

  const reset = useCallback(() => {
    retryRef.current = null;
    update("idle");
  }, [update]);

  const retry = useCallback(() => retryRef.current?.(), []);

  const unsent =
    status === "pending" || status === "saving" || status === "failed";
  useEffect(() => {
    if (!unsent) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Older browsers need a value to show the prompt.
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [unsent]);

  return {
    status,
    markPending,
    begin,
    succeed,
    fail,
    freeze,
    reset,
    retry,
  };
}
