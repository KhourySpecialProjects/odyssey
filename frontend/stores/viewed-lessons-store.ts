import { useMemo } from "react";
import { create } from "zustand";

/**
 * Lessons marked viewed in this browser session whose save may still be in
 * flight, keyed by enrollment id. "Next" navigates before its progress save
 * finishes, and the droplet layout (sidebar) doesn't re-render on
 * lesson-to-lesson navigation, so the sidebar, footer and lesson lock check
 * merge these in to avoid showing the lesson just finished as unviewed (and
 * the next one as locked) until the save lands.
 *
 * Keyed by enrollment because progress belongs to an enrollment, not a
 * lesson: lessons are shared between droplets, and re-enrolling in the same
 * tab creates a new enrollment. A lesson id alone would make a lesson viewed
 * in another droplet or an earlier enrollment look saved here.
 */
type ViewedLessonsState = {
  pendingViewed: Record<string, number[]>;
  markViewed: (enrollmentId: string, lessonId: number) => void;
  unmarkViewed: (enrollmentId: string, lessonId: number) => void;
};

export const useViewedLessonsStore = create<ViewedLessonsState>()((set) => ({
  pendingViewed: {},
  markViewed: (enrollmentId, lessonId) =>
    set((state) => {
      const current = state.pendingViewed[enrollmentId] ?? [];
      if (current.includes(lessonId)) return state;
      return {
        pendingViewed: {
          ...state.pendingViewed,
          [enrollmentId]: [...current, lessonId],
        },
      };
    }),
  unmarkViewed: (enrollmentId, lessonId) =>
    set((state) => ({
      pendingViewed: {
        ...state.pendingViewed,
        [enrollmentId]: (state.pendingViewed[enrollmentId] ?? []).filter(
          (id) => id !== lessonId,
        ),
      },
    })),
}));

// Stable fallback: a selector returning a fresh array on each call would make
// zustand re-render forever.
const EMPTY: number[] = [];

/**
 * The server's completed lesson ids plus this enrollment's pending ones,
 * de-duplicated. Without an enrollment (not enrolled, author/admin preview)
 * nothing is pending.
 */
export function useViewedLessonIds(
  enrollmentId: string | undefined,
  serverIds: number[],
): number[] {
  const pending = useViewedLessonsStore((s) =>
    enrollmentId ? s.pendingViewed[enrollmentId] ?? EMPTY : EMPTY,
  );
  return useMemo(
    () =>
      pending.length
        ? Array.from(new Set([...serverIds, ...pending]))
        : serverIds,
    [serverIds, pending],
  );
}
