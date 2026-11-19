import "server-only";
import { CACHE_TAGS } from "@/lib/cache-tags";
import type { CoCompletion } from "@/lib/recommendations/rules";
import { fetchAPI } from "@/lib/utils";

type Pair = { source?: unknown; target?: unknown; count?: unknown } | null;

/** Global read: one shared URL with no user data in it. Throws on failure. */
export async function getCoCompletion(): Promise<CoCompletion> {
  const response = await fetchAPI<{ data?: { pairs?: Pair[] } }>(
    "/co-completions",
    {
      next: { tags: [CACHE_TAGS.coCompletion], revalidate: 3600 },
      flattenResponse: false,
    },
  );
  const map: CoCompletion = new Map();
  for (const pair of response?.data?.pairs ?? []) {
    const { source, target, count } = pair ?? {};
    if (
      !Number.isInteger(source) ||
      !Number.isInteger(target) ||
      !Number.isInteger(count)
    )
      continue;
    const targets = map.get(source as number) ?? [];
    targets.push({ id: target as number, count: count as number });
    map.set(source as number, targets);
  }
  return map;
}
