"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const keyFor = (reviewId: number) => `review-note:${reviewId}`;

/**
 * The reviewer's summary note draft, kept in this browser per review (ODY-805 D8).
 * A note typed before the review opens moves to its id once it does.
 */
export function useSummaryNote(reviewId: number | null | undefined) {
  const [note, setNoteState] = useState("");
  const current = useRef(note);
  current.current = note;
  const loadedFor = useRef<number | null>(null);

  useEffect(() => {
    const id = reviewId ?? null;
    if (id === loadedFor.current) return;
    const carried = loadedFor.current === null ? current.current : "";
    loadedFor.current = id;
    if (id === null) {
      setNoteState("");
      return;
    }
    try {
      const stored = localStorage.getItem(keyFor(id)) ?? "";
      if (!stored && carried) localStorage.setItem(keyFor(id), carried);
      setNoteState(stored || carried);
    } catch {
      // Private mode: the note lasts for this page view
      if (carried) setNoteState(carried);
    }
  }, [reviewId]);

  const setNote = useCallback(
    (next: string) => {
      setNoteState(next);
      current.current = next;
      if (reviewId == null) return;
      try {
        if (next) localStorage.setItem(keyFor(reviewId), next);
        else localStorage.removeItem(keyFor(reviewId));
      } catch {
        // Full quota or private mode
      }
    },
    [reviewId],
  );

  return { note, setNote };
}
