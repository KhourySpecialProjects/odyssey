"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const MAX_SEEN = 2000;
const CHANGED = "review-seen-replies-changed";

const keyFor = (dropletId: number) => `review-seen-replies-${dropletId}`;

function read(dropletId: number): number[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(keyFor(dropletId)) ?? "[]");
    return Array.isArray(parsed)
      ? parsed.filter((id): id is number => Number.isInteger(id))
      : [];
  } catch {
    return [];
  }
}

/** Keeps the newest ids (the highest), as the oldest threads are the least likely to matter. */
function write(dropletId: number, ids: Iterable<number>) {
  const newest = [...ids].sort((a, b) => a - b).slice(-MAX_SEEN);
  try {
    localStorage.setItem(keyFor(dropletId), JSON.stringify(newest));
  } catch {
    // Private mode or a full quota: replies read here show as new again next visit
  }
  return newest;
}

/**
 * Reply ids this browser has opened (ODY-881, G7), kept in localStorage per
 * droplet. Every hook instance for a droplet shares it through an event.
 */
export function useSeenReplies(dropletId: number | undefined) {
  const [seen, setSeen] = useState<ReadonlySet<number>>(new Set());
  const seenRef = useRef(seen);
  seenRef.current = seen;

  useEffect(() => {
    if (dropletId == null) {
      setSeen(new Set());
      return;
    }
    // Seen only grows, so a reload adds to what's held (storage may be unwritable)
    const reload = () =>
      setSeen((held) => {
        const added = read(dropletId).filter((id) => !held.has(id));
        return added.length === 0 ? held : new Set([...held, ...added]);
      });
    setSeen(new Set(read(dropletId)));
    const onChanged = (e: Event) => {
      if ((e as CustomEvent<number>).detail === dropletId) reload();
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === keyFor(dropletId)) reload();
    };
    window.addEventListener(CHANGED, onChanged);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(CHANGED, onChanged);
      window.removeEventListener("storage", onStorage);
    };
  }, [dropletId]);

  const markSeen = useCallback(
    (ids: readonly number[]) => {
      if (dropletId == null) return;
      const fresh = ids.filter((id) => id > 0 && !seenRef.current.has(id));
      if (fresh.length === 0) return;
      const next = write(dropletId, [
        ...read(dropletId),
        ...seenRef.current,
        ...fresh,
      ]);
      const merged = new Set(next);
      seenRef.current = merged;
      setSeen(merged);
      window.dispatchEvent(new CustomEvent(CHANGED, { detail: dropletId }));
    },
    [dropletId],
  );

  return { seen, markSeen };
}
