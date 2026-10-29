"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const keyFor = (reviewId: number) => `review-dismissed:${reviewId}`;

function read(reviewId: number): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(keyFor(reviewId)) ?? "[]");
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}

function write(reviewId: number, ids: Iterable<string>) {
  try {
    localStorage.setItem(keyFor(reviewId), JSON.stringify([...ids]));
  } catch {
    // Private mode or a full quota: dismissals last for this page view only
  }
}

/**
 * Findings the reviewer marked "Not an issue" (ODY-805 D10), kept per browser.
 * With no review yet they live in memory and are saved once one opens.
 */
export function useDismissedFindings(reviewId: number | null | undefined) {
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(new Set());
  const loadedFor = useRef<number | null>(null);
  const current = useRef(dismissed);
  current.current = dismissed;

  useEffect(() => {
    const id = reviewId ?? null;
    if (id === loadedFor.current) return;
    const carried =
      loadedFor.current === null ? current.current : new Set<string>();
    loadedFor.current = id;
    if (id === null) {
      setDismissed(new Set());
      return;
    }
    const merged = new Set([...read(id), ...carried]);
    if (carried.size > 0) write(id, merged);
    setDismissed(merged);
  }, [reviewId]);

  const update = useCallback(
    (change: (next: Set<string>) => void) => {
      const next = new Set(current.current);
      change(next);
      current.current = next;
      setDismissed(next);
      if (reviewId != null) write(reviewId, next);
    },
    [reviewId],
  );

  const dismiss = useCallback(
    (findingId: string) => update((s) => s.add(findingId)),
    [update],
  );
  const undismiss = useCallback(
    (findingId: string) => update((s) => s.delete(findingId)),
    [update],
  );

  return { dismissed, dismiss, undismiss };
}
