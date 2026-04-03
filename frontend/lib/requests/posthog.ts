const POSTHOG_PROJECT_ID = "53063";

function getPostHogConfig() {
  const apiKey = process.env.POSTHOG_API_KEY;
  const host =
    process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com";
  return { apiKey, host };
}

function getHeaders(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey.trim()}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

async function runHogQLQuery(query: string): Promise<any[][] | null> {
  const { apiKey, host } = getPostHogConfig();
  if (!apiKey) {
    console.error("PostHog API key is not configured");
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(
      `${host}/api/projects/${POSTHOG_PROJECT_ID}/query/`,
      {
        method: "POST",
        headers: getHeaders(apiKey),
        body: JSON.stringify({ query: { kind: "HogQLQuery", query } }),
        cache: "no-store",
        signal: controller.signal,
      },
    );
    clearTimeout(timeout);

    if (!res.ok) {
      const text = await res.text();
      console.error("PostHog HogQL query failed:", {
        status: res.status,
        response: text.substring(0, 300),
      });
      return null;
    }

    const data = await res.json();
    return data.results ?? null;
  } catch (e: any) {
    clearTimeout(timeout);
    if (e.name === "AbortError") {
      console.warn("PostHog HogQL query timed out");
    } else {
      console.error("PostHog HogQL query error:", e.message);
    }
    return null;
  }
}

// Cache the insights list for the duration of a single request
let insightsListCache: { data: any; timestamp: number } | null = null;
const CACHE_TTL = 5000; // 5 seconds

async function getInsightsList(): Promise<any | null> {
  if (
    insightsListCache &&
    Date.now() - insightsListCache.timestamp < CACHE_TTL
  ) {
    return insightsListCache.data;
  }

  const { apiKey, host } = getPostHogConfig();
  if (!apiKey) {
    console.error("PostHog API key is not configured");
    return null;
  }

  const headers = getHeaders(apiKey);
  const listUrl = `${host}/api/projects/${POSTHOG_PROJECT_ID}/insights/`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const listRes = await fetch(listUrl, {
      method: "GET",
      headers,
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const listText = await listRes.text();
    if (!listRes.ok) {
      console.error("Failed to list insights:", {
        status: listRes.status,
        response: listText.substring(0, 200),
      });
      return null;
    }

    const data = JSON.parse(listText);
    insightsListCache = { data, timestamp: Date.now() };
    return data;
  } catch (e: any) {
    clearTimeout(timeout);
    if (e.name === "AbortError") {
      console.warn("PostHog insights list request timed out");
    }
    return null;
  }
}

async function fetchInsightByName(
  nameMatch: (insight: any) => boolean,
  label: string,
): Promise<any | null> {
  const { apiKey, host } = getPostHogConfig();
  if (!apiKey) return null;

  const insights = await getInsightsList();
  if (!insights) return null;

  const matched = insights.results?.find(nameMatch);
  if (!matched) {
    console.warn(`PostHog: "${label}" insight not found — using fallback data`);
    return null;
  }

  const headers = getHeaders(apiKey);
  const insightUrl = `${host}/api/projects/${POSTHOG_PROJECT_ID}/insights/${matched.id}/`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const insightRes = await fetch(insightUrl, {
      method: "GET",
      headers,
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const insightText = await insightRes.text();
    if (!insightRes.ok) {
      console.error(`Failed to fetch ${label} insight:`, {
        status: insightRes.status,
        response: insightText.substring(0, 200),
      });
      return null;
    }

    return JSON.parse(insightText);
  } catch (e: any) {
    clearTimeout(timeout);
    if (e.name === "AbortError") {
      console.warn(`PostHog "${label}" insight request timed out`);
    }
    return null;
  }
}

function extractTimeSeries(
  data: any,
): { dates: string[]; values: number[] } | null {
  const result = Array.isArray(data?.result) ? data.result[0] : null;
  const dates: string[] = result?.days ?? result?.labels ?? [];
  const values: number[] = result?.data ?? [];

  if (!dates.length || !values.length) return null;
  if (!values.every((n) => typeof n === "number")) return null;

  return { dates, values };
}

export async function fetchDailyActiveUsers(): Promise<
  { date: string; count: number }[]
> {
  try {
    const rows = await runHogQLQuery(
      `SELECT toString(toStartOfDay(timestamp)) AS date,
              count(distinct distinct_id) AS active_users
       FROM events
       WHERE event = '$pageview'
         AND timestamp >= today() - INTERVAL 90 DAY
       GROUP BY date
       ORDER BY date ASC`,
    );
    if (!rows) return [];

    return rows.map((row) => ({
      date: (row[0] as string).split(" ")[0],
      count: row[1] as number,
    }));
  } catch (e: any) {
    console.error("PostHog Fetch Error (DAU):", e.message);
    return [];
  }
}

export async function fetchWeeklyActiveUsers(): Promise<
  { date: any; count: any }[]
> {
  try {
    const data = await fetchInsightByName(
      (insight: any) =>
        insight.name?.toLowerCase().includes("weekly active users") ||
        insight.name?.toLowerCase().includes("wau"),
      "WAU",
    );
    if (!data) return [];

    const series = extractTimeSeries(data);
    if (!series) return [];

    return series.dates.map((date, i) => ({ date, count: series.values[i] }));
  } catch (e: any) {
    console.error("PostHog Fetch Error (WAU):", e.message);
    return [];
  }
}

export async function fetchUniquePageview(): Promise<
  { date: string; count: number }[]
> {
  try {
    const rows = await runHogQLQuery(
      `SELECT toString(toStartOfDay(timestamp)) AS date, count(DISTINCT distinct_id) AS pageviews
       FROM events
       WHERE event = '$pageview'
         AND timestamp >= today() - INTERVAL 90 DAY
       GROUP BY date
       ORDER BY date ASC`,
    );
    if (!rows) return [];

    return rows.map((row) => ({
      date: (row[0] as string).split(" ")[0],
      count: row[1] as number,
    }));
  } catch (e: any) {
    console.error("PostHog Fetch Error (pageviews):", e.message);
    return [];
  }
}

export async function fetchWeeklyNewUsers(): Promise<
  { date: any; count: any }[]
> {
  try {
    const data = await fetchInsightByName(
      (insight: any) =>
        insight.name?.toLowerCase().includes("growth accounting"),
      "new users",
    );
    if (!data) return [];

    const series = extractTimeSeries(data);
    if (!series) return [];

    return series.dates.map((date, i) => ({ date, count: series.values[i] }));
  } catch (e: any) {
    console.error("PostHog Fetch Error (new users):", e.message);
    return [];
  }
}

export async function fetchLessonScrollDepth(
  dropletId: number,
  lessonIds: number[],
): Promise<Map<number, Map<number, number>>> {
  if (lessonIds.length === 0) return new Map();
  try {
    const rows = await runHogQLQuery(
      `SELECT
         JSONExtractInt(properties, 'lesson_id') AS lesson_id,
         JSONExtractInt(properties, 'percent') AS pct,
         count(DISTINCT distinct_id) AS users
       FROM events
       WHERE event = 'lesson_scroll_depth'
         AND JSONExtractInt(properties, 'droplet_id') = ${dropletId}
         AND JSONExtractInt(properties, 'lesson_id') IN (${lessonIds.join(", ")})
       GROUP BY lesson_id, pct`,
    );
    if (!rows) return new Map();

    const result = new Map<number, Map<number, number>>();
    for (const [lessonId, pct, users] of rows as [number, number, number][]) {
      if (!result.has(lessonId)) result.set(lessonId, new Map());
      result.get(lessonId)!.set(pct, users);
    }
    return result;
  } catch (e: unknown) {
    console.error(
      "PostHog Fetch Error (scroll depth):",
      e instanceof Error ? e.message : e,
    );
    return new Map();
  }
}

export async function fetchAvgSessionDuration(): Promise<
  { date: string; duration: number }[]
> {
  try {
    // Compute avg session duration per day by measuring the span of each
    // session (first to last event) then averaging across sessions per day.
    const rows = await runHogQLQuery(
      `SELECT toString(toStartOfDay(min_ts)) AS date,
              round(avg(session_secs) / 60, 1) AS avg_min
       FROM (
         SELECT properties.$session_id AS sid,
                min(timestamp) AS min_ts,
                dateDiff('second', min(timestamp), max(timestamp)) AS session_secs
         FROM events
         WHERE timestamp >= today() - INTERVAL 90 DAY
           AND properties.$session_id IS NOT NULL
         GROUP BY sid
         HAVING session_secs > 0
       )
       GROUP BY date
       ORDER BY date ASC`,
    );
    if (!rows) return [];

    return rows.map((row) => ({
      date: (row[0] as string).split(" ")[0],
      duration: row[1] as number,
    }));
  } catch (e: any) {
    console.error("PostHog Fetch Error (session duration):", e.message);
    return [];
  }
}
