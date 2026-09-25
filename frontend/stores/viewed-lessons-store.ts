import { create } from "zustand";

/**
 * Lessons marked viewed in this browser session whose save may still be in
 * flight. "Next" navigates before its progress save finishes, and the droplet
 * layout (sidebar) doesn't re-render on lesson-to-lesson navigation, so the
 * sidebar merges these in to avoid showing the lesson just finished as
 * unviewed (and the current one as locked) until the save lands.
 */
type ViewedLessonsState = {
  pendingViewedIds: number[];
  markViewed: (lessonId: number) => void;
  unmarkViewed: (lessonId: number) => void;
};

export const useViewedLessonsStore = create<ViewedLessonsState>()((set) => ({
  pendingViewedIds: [],
  markViewed: (lessonId) =>
    set((state) =>
      state.pendingViewedIds.includes(lessonId)
        ? state
        : { pendingViewedIds: [...state.pendingViewedIds, lessonId] },
    ),
  unmarkViewed: (lessonId) =>
    set((state) => ({
      pendingViewedIds: state.pendingViewedIds.filter((id) => id !== lessonId),
    })),
}));
