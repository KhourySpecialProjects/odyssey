"use client";

import { useState } from "react";
import { toast } from "sonner";
import { RecommendationStrip } from "@/components/recommendations/recommendation-strip";
import { dismissRecommendation } from "@/lib/requests/recommendations";
import type { Recommendation } from "@/types";

const PAGE_SIZE = 3;

/** Activity's strip: Refresh pages through the loaded picks, and ✕ hides one for good. */
export function ActivityRecommendations({
  initialPicks,
}: {
  initialPicks: Recommendation[];
}) {
  const [picks, setPicks] = useState(initialPicks);
  const [start, setStart] = useState(0);

  if (picks.length === 0) return null;

  // Shown from `start`, wrapping round, so a dismissed pick's place fills at once
  const from = start % picks.length;
  const shown = [...picks.slice(from), ...picks.slice(0, from)];

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

  return (
    <div className="mb-6 shrink-0">
      <RecommendationStrip
        recommendations={shown}
        onRefresh={
          picks.length > PAGE_SIZE
            ? () => setStart((s) => (s + PAGE_SIZE) % picks.length)
            : undefined
        }
        onDismiss={dismiss}
      />
    </div>
  );
}
