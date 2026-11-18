"use client";

import { useCallback, useEffect, useRef } from "react";
import { getThreadStamp } from "@/lib/requests/reviews";

const INTERVAL_MS = 30_000;
const MIN_GAP_MS = 5_000;
const MAX_FAILURES = 3;

/**
 * Polls a droplet's reply stamp every 30 s while visible and on focus, and calls
 * `onChange` when it changes (ODY-881). `check` runs one on demand.
 */
export function useThreadRefresh(
  dropletId: number | undefined,
  enabled: boolean,
  onChange: () => void,
) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const baseline = useRef<string | null>(null);
  const failures = useRef(0);
  const inFlight = useRef(false);
  const active = useRef(false);
  // Bumped when the droplet or enabled changes, so an older result is ignored
  const generation = useRef(0);
  const lastOkAt = useRef(0);

  const check = useCallback(async () => {
    if (!active.current || dropletId == null || inFlight.current) return;
    if (Date.now() - lastOkAt.current < MIN_GAP_MS) return;
    const gen = generation.current;
    inFlight.current = true;
    const result = await getThreadStamp(dropletId).catch(() => null);
    if (gen !== generation.current) return;
    inFlight.current = false;
    if (!result?.ok) {
      failures.current++;
      return;
    }
    failures.current = 0;
    lastOkAt.current = Date.now();
    const previous = baseline.current;
    baseline.current = result.data.stamp;
    if (previous !== null && previous !== result.data.stamp) {
      onChangeRef.current();
    }
  }, [dropletId]);

  useEffect(() => {
    generation.current++;
    baseline.current = null;
    failures.current = 0;
    inFlight.current = false;
    lastOkAt.current = 0;
    active.current = enabled && dropletId != null;
    if (!active.current) return;

    const visible = () => document.visibilityState === "visible";
    const tick = () => {
      if (visible() && failures.current < MAX_FAILURES) check();
    };
    // A return to the tab or window is a fresh start, so it clears a pause
    const wake = () => {
      if (!visible()) return;
      failures.current = 0;
      check();
    };
    tick();
    const timer = setInterval(tick, INTERVAL_MS);
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("focus", wake);
    return () => {
      active.current = false;
      generation.current++;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("focus", wake);
    };
  }, [dropletId, enabled, check]);

  return { check };
}
