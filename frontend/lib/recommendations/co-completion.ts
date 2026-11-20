import "server-only";
import { CACHE_TAGS } from "@/lib/cache-tags";
import type {
  CoCompletion,
  CompletionCounts,
} from "@/lib/recommendations/rules";
import { fetchAPI } from "@/lib/utils";

type Pair = { source?: unknown; target?: unknown; count?: unknown } | null;
type Completion = { droplet?: unknown; count?: unknown } | null;

/** Global read: one shared URL, no user data. Throws on failure. */
export async function getCoCompletion(): Promise<{
  pairs: CoCompletion;
  completions: CompletionCounts;
}> {
  const response = await fetchAPI<{
    data?: { pairs?: Pair[]; completions?: Completion[] };
  }>("/co-completions", {
    next: { tags: [CACHE_TAGS.coCompletion], revalidate: 3600 },
    flattenResponse: false,
  });
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
  const completions: CompletionCounts = new Map();
  const rows = response?.data?.completions;
  for (const row of Array.isArray(rows) ? rows : []) {
    const { droplet, count } = row ?? {};
    if (Number.isInteger(droplet) && Number.isInteger(count))
      completions.set(droplet as number, count as number);
  }
  return { pairs: map, completions };
}
