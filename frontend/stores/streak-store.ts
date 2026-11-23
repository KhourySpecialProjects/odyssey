import { create } from "zustand";
import type { Streak } from "@/lib/streaks";

/**
 * The signed-in learner's streak (ODY-919), shared by the header pill, the
 * lesson banner and the feed card. The pill fills it from the server on each
 * render, and the lesson footer refreshes it after a lesson lights today.
 * Only set in effects and event handlers, so the server's copy of this
 * module stays empty and never holds anyone's streak.
 */
export const useStreakStore = create<{
  streak: Streak | null;
  setStreak: (streak: Streak) => void;
}>()((set) => ({
  streak: null,
  // An equal streak (a re-render's copy) changes nothing, so subscribers
  // that pass the streak back down don't loop
  setStreak: (streak) =>
    set((state) =>
      JSON.stringify(state.streak) === JSON.stringify(streak)
        ? state
        : { streak },
    ),
}));
