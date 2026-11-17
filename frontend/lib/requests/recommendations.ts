"use server";

import { withAuth } from "@/lib/auth/guards";
import { getRecommendations } from "@/lib/recommendations";
import { RecommendationOptionsSchema } from "@/lib/validations/recommendations";
import type { Recommendation, RecommendationOptions } from "@/types";

/** The signed-in learner's recommended droplets (ODY-952). Only ever the caller's own. */
export async function getMyRecommendations(
  options: RecommendationOptions,
): Promise<
  | { ok: true; error: null; data: Recommendation[] }
  | { ok: false; error: string; data: null }
> {
  return withAuth([], async (user) => {
    const parsed = RecommendationOptionsSchema.safeParse(options);
    if (!parsed.success) {
      return { ok: false as const, error: "invalid_options", data: null };
    }
    try {
      const data = await getRecommendations(user.id, parsed.data);
      return { ok: true as const, error: null, data };
    } catch (error) {
      console.error("Error getting recommendations:", error);
      return {
        ok: false as const,
        error: "Couldn't load recommendations.",
        data: null,
      };
    }
  });
}
