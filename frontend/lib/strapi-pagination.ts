import { fetchAPI } from "@/lib/utils";

/**
 * Strapi's REST `maxLimit` (`backend/config/api.ts`): the largest page it
 * serves. A bigger pageSize is cut to this, which would end the loop below
 * early, so `testing/lib/strapi-pagination.test.ts` checks the two agree.
 */
export const STRAPI_MAX_PAGE_SIZE = 1000;

/** A runaway guard: 100 pages is 100,000 rows at the largest page size. */
const MAX_PAGES = 100;

type FetchAPIConfig = Parameters<typeof fetchAPI>[1];

/**
 * Reads every page of a Strapi list through `fetchAPI` and returns the rows in
 * order (ODY-720). Without `pagination` Strapi answers with 25 rows and drops
 * the rest. `urlParams.pagination` is set here; the loop ends on a short page.
 * Each page is its own cached request, so keep one page under Next's 2 MB
 * cache limit: lower `pageSize` for wide rows.
 */
export async function fetchAllPages<T>(
  path: string,
  config: FetchAPIConfig,
  pageSize = STRAPI_MAX_PAGE_SIZE,
): Promise<T[]> {
  const rows: T[] = [];
  // fetchAPI types urlParams as `Object`, which can't be spread as is
  const params = config.urlParams as Record<string, unknown> | undefined;
  for (let page = 1; page <= MAX_PAGES; page++) {
    const batch = await fetchAPI<T[] | null>(path, {
      ...config,
      urlParams: { ...params, pagination: { page, pageSize } },
    });
    if (!batch || batch.length === 0) return rows;
    rows.push(...batch);
    if (batch.length < pageSize) return rows;
  }
  console.error(
    `fetchAllPages("${path}"): stopped after ${MAX_PAGES} pages; later rows are missing`,
  );
  return rows;
}
