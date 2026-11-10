import { fetchAPI } from "@/lib/utils";
import type { PanelCriterion } from "@/lib/requests/reviews";

/** Active review criteria, ordered. Not "use server": it must not become an endpoint. */
export async function fetchActiveCriteria(): Promise<PanelCriterion[]> {
  const criteria = await fetchAPI<PanelCriterion[] | null>("/review-criteria", {
    urlParams: {
      filters: { active: { $eq: true } },
      fields: [
        "name",
        "order",
        "active",
        "lessonDescription",
        "overallDescription",
      ],
      sort: ["order:asc"],
      pagination: { pageSize: 100 },
    },
    cache: "no-store",
  });
  return criteria ?? [];
}
