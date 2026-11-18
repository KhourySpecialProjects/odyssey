import "server-only";
import { getRankInput } from "@/lib/recommendations/candidates";
import { rankRecommendations } from "@/lib/recommendations/rules";
import { MAX_RECOMMENDATIONS } from "@/lib/validations/recommendations";
import type { Recommendation, RecommendationOptions } from "@/types";

/** Ranked picks for one student by the ODY-957 rules. Never throws. */
export async function getRecommendations(
  userId: number,
  { limit, excludeDropletIds }: RecommendationOptions,
): Promise<Recommendation[]> {
  const size = Math.min(Math.floor(limit), MAX_RECOMMENDATIONS);
  if (!(size > 0)) return [];

  try {
    return rankRecommendations(
      await getRankInput(userId, excludeDropletIds ?? []),
      size,
    );
  } catch (error) {
    console.error("getRecommendations failed:", (error as Error)?.name);
    return [];
  }
}
