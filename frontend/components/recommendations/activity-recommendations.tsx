"use client";

import { useState } from "react";
import { useDismissablePicks } from "@/components/recommendations/recommendation-picks";
import { RecommendationStrip } from "@/components/recommendations/recommendation-strip";
import type { Recommendation } from "@/types";

const PAGE_SIZE = 3;

/** Activity's strip: Refresh pages through the loaded picks, and ✕ hides one for good. */
export function ActivityRecommendations({
  initialPicks,
}: {
  initialPicks: Recommendation[];
}) {
  const { picks, dismiss } = useDismissablePicks(initialPicks);
  const [start, setStart] = useState(0);

  if (picks.length === 0) return null;

  // Shown from `start`, wrapping round, so a dismissed pick's place fills at once
  const from = start % picks.length;
  const shown = [...picks.slice(from), ...picks.slice(0, from)];

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
