import "server-only";
import { getRecommendations } from "@/lib/recommendations";
import type { Recommendation, RecommendationRule } from "@/types";

// The banner, 4 tiles, and spares so a dismissed tile's place fills
const RECAP_PICKS = 8;

const NEXT_STEP_RULES = new Set<RecommendationRule>([
  "next-in-voyage",
  "next-in-playlist",
]);

/** Recap's picks, minus the droplet just finished. `next` is the voyage or playlist step for the banner. */
export async function getRecapPicks(
  userId: number,
  dropletId: number,
): Promise<{ picks: Recommendation[]; next: Recommendation | null }> {
  const picks = await getRecommendations(userId, {
    surface: "recap",
    limit: RECAP_PICKS,
    excludeDropletIds: [dropletId],
  });
  const top = picks[0];
  return {
    picks,
    next: top && NEXT_STEP_RULES.has(top.rule) ? top : null,
  };
}
