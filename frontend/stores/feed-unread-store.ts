import { create } from "zustand";

/**
 * The My Feed unread badge's announcement count (ODY-930). The activity
 * layout seeds `serverCount`; while the feed is mounted it owns the count
 * through `feedCount` (the current filters, plus optimistic ±1). Only set in
 * effects and handlers, so the server's copy of this module stays empty.
 * `streakReadKey` is the streak card's read marker (ODY-919), shared so
 * reading it in the feed lowers the badge; undefined until storage is read.
 */
export const useFeedUnreadStore = create<{
  serverCount: number | null;
  feedCount: number | null;
  streakReadKey: string | null | undefined;
  setServerCount: (count: number) => void;
  setFeedCount: (count: number | null) => void;
  adjustFeedCount: (delta: number) => void;
  setStreakReadKey: (key: string | null) => void;
}>()((set) => ({
  serverCount: null,
  feedCount: null,
  streakReadKey: undefined,
  setServerCount: (serverCount) => set({ serverCount }),
  setFeedCount: (feedCount) => set({ feedCount }),
  adjustFeedCount: (delta) =>
    set((s) => ({
      // Unclamped so a rollback undoes its own step; the badge hides <= 0
      feedCount: (s.feedCount ?? s.serverCount ?? 0) + delta,
    })),
  setStreakReadKey: (streakReadKey) => set({ streakReadKey }),
}));
