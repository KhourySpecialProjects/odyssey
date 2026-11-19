"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { dismissRecommendation } from "@/lib/requests/recommendations";
import type { Recommendation } from "@/types";

/** Picks the student can dismiss: gone at once, saved, and put back with a toast if saving fails. */
export function useDismissablePicks(initialPicks: Recommendation[]) {
  const [picks, setPicks] = useState(initialPicks);

  async function dismiss(dropletId: number) {
    const index = picks.findIndex((pick) => pick.droplet.id === dropletId);
    const removed = picks[index];
    if (!removed) return;

    setPicks((current) => current.filter((pick) => pick !== removed));
    const result = await dismissRecommendation(dropletId);
    if (!result.ok) {
      setPicks((current) => [
        ...current.slice(0, index),
        removed,
        ...current.slice(index),
      ]);
      toast.error(`Couldn't hide ${removed.droplet.name}. Try again.`);
    }
  }

  return { picks, dismiss };
}

type Picks = ReturnType<typeof useDismissablePicks>;

const PicksContext = createContext<Picks>({
  picks: [],
  dismiss: async () => {},
});

/** One list for a page, so a pick dismissed in Recap's pop-up also leaves its tiles. */
export function RecommendationPicksProvider({
  initialPicks,
  children,
}: {
  initialPicks: Recommendation[];
  children: ReactNode;
}) {
  const value = useDismissablePicks(initialPicks);
  return (
    <PicksContext.Provider value={value}>{children}</PicksContext.Provider>
  );
}

/** The page's picks, or none outside a provider. */
export const useRecommendationPicks = () => useContext(PicksContext);
