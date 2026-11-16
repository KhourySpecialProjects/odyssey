import { z } from "zod";
import type { RecommendationOptions, RecommendationSurface } from "@/types";

/** Both ways checked: a surface added to or missing from the type fails tsc. */
const SURFACES = {
  activity: true,
  recap: true,
  completion: true,
  onboarding: true,
} satisfies Record<RecommendationSurface, true>;

export const MAX_RECOMMENDATIONS = 24;

export const RecommendationOptionsSchema = z.object({
  surface: z.enum(Object.keys(SURFACES) as [RecommendationSurface]),
  limit: z.number().int().min(1).max(MAX_RECOMMENDATIONS),
  excludeDropletIds: z.array(z.number().int().positive()).max(50).optional(),
}) satisfies z.ZodType<RecommendationOptions>;
