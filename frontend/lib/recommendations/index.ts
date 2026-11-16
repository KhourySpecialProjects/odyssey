import "server-only";
import { getDroplets } from "@/lib/requests/droplet";
import { MAX_RECOMMENDATIONS } from "@/lib/validations/recommendations";
import { USER_POPULATES } from "@/lib/requests/user-populates";
import type {
  Droplet,
  Recommendation,
  RecommendationOptions,
  RecommendedDroplet,
} from "@/types";

const PLACEHOLDER_REASON = "Top rated on Odyssey";

/** Narrows a fetched droplet; null without a documentId. Typed, so field drift fails tsc. */
function toRecommended(d: Droplet): RecommendedDroplet | null {
  if (!d.documentId) return null;
  return {
    id: d.id,
    documentId: d.documentId,
    name: d.name,
    slug: d.slug,
    type: d.type,
    focusArea: d.focusArea,
    difficulty: d.difficulty,
    description: d.description,
    averageRating: d.averageRating,
    tags: d.tags,
    lessons: d.lessons,
    authorized_users: d.authorized_users,
  };
}

/** Stub: top-rated live droplets as rule "popular". Never throws (ODY-952). */
export async function getRecommendations(
  _userId: number,
  { limit, excludeDropletIds }: RecommendationOptions,
): Promise<Recommendation[]> {
  const size = Math.min(Math.floor(limit), MAX_RECOMMENDATIONS);
  if (!(size > 0)) return [];
  const ids = excludeDropletIds ?? [];

  try {
    const droplets = await getDroplets({
      filters: {
        $and: [
          { status: { $eq: "published" } },
          { isHidden: false },
          { lessons: { id: { $notNull: true } } },
          { averageRating: { $notNull: true } },
          ...(ids.length ? [{ id: { $notIn: ids } }] : []),
        ],
      },
      sort: ["averageRating:desc", "name:asc"],
      pagination: { page: 1, pageSize: size },
      fields: [
        "name",
        "slug",
        "type",
        "focusArea",
        "difficulty",
        "description",
        "averageRating",
      ],
      populate: {
        lessons: { fields: ["id"] },
        tags: { fields: ["name", "slug"] },
        authorized_users: USER_POPULATES.authorName,
      },
    });
    return droplets.slice(0, size).flatMap((droplet) => {
      const picked = toRecommended(droplet);
      return picked
        ? [
            {
              droplet: picked,
              reason: PLACEHOLDER_REASON,
              rule: "popular" as const,
            },
          ]
        : [];
    });
  } catch (error) {
    console.error("getRecommendations failed:", error);
    return [];
  }
}
