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

// Cache the insights list for the duration of a single request
let insightsListCache: { data: any; timestamp: number } | null = null;
const CACHE_TTL = 5000; // 5 seconds

async function getInsightsList(): Promise<any | null> {
  if (insightsListCache && Date.now() - insightsListCache.timestamp < CACHE_TTL) {
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
  { date: any; count: any }[]
> {
  try {
    const data = await fetchInsightByName(
      (insight: any) =>
        insight.name?.toLowerCase().includes("daily active users") ||
        insight.name?.toLowerCase().includes("dau"),
      "DAU",
    );
    if (!data) return [];

    const series = extractTimeSeries(data);
    if (!series) return [];

    return series.dates.map((date, i) => ({ date, count: series.values[i] }));
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
  { date: any; count: any }[]
> {
  try {
    const data = await fetchInsightByName(
      (insight: any) =>
        insight.derived_name?.toLowerCase().includes("pageview count"),
      "pageview count",
    );
    if (!data) return [];

    const series = extractTimeSeries(data);
    if (!series) return [];

    return series.dates.map((date, i) => ({ date, count: series.values[i] }));
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

export async function fetchAvgSessionDuration(): Promise<
  { date: string; duration: number }[]
> {
  try {
    const data = await fetchInsightByName(
      (insight: any) =>
        insight.name?.toLowerCase().includes("session duration") ||
        insight.derived_name?.toLowerCase().includes("session duration"),
      "session duration",
    );
    if (!data) return [];

    const series = extractTimeSeries(data);
    if (!series) return [];

    return series.dates.map((date, i) => ({
      date,
      // PostHog returns seconds — convert to minutes, round to 1 decimal
      duration: Math.round((series.values[i] / 60) * 10) / 10,
    }));
  } catch (e: any) {
    console.error("PostHog Fetch Error (session duration):", e.message);
    return [];
  }
}
