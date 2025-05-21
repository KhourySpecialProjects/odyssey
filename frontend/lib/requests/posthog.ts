export async function fetchDailyActiveUsers(): Promise<
  { date: any; count: any }[]
> {
  const projectId = "53063";
  const apiKey = process.env.POSTHOG_API_KEY;
  const host =
    process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com";

  if (!apiKey) {
    console.error("PostHog API key is not configured");
    return [];
  }

  try {
    const listUrl = `${host}/api/projects/${projectId}/insights/`;

    const headers = {
      Authorization: `Bearer ${apiKey.trim()}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    const listRes = await fetch(listUrl, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    const listText = await listRes.text();

    if (!listRes.ok) {
      console.error("Failed to list insights:", {
        status: listRes.status,
        statusText: listRes.statusText,
        response: listText.substring(0, 200),
      });
      return [];
    }

    try {
      const insights = JSON.parse(listText);

      const dauInsight = insights.results?.find(
        (insight: any) =>
          insight.name?.toLowerCase().includes("daily active users") ||
          insight.name?.toLowerCase().includes("dau"),
      );

      if (!dauInsight) {
        console.error("Could not find DAU insight in the list");
        return [];
      }

      const insightUrl = `${host}/api/projects/${projectId}/insights/${dauInsight.id}/`;
      const insightRes = await fetch(insightUrl, {
        method: "GET",
        headers,
        cache: "no-store",
      });

      const insightText = await insightRes.text();

      if (!insightRes.ok) {
        console.error("Failed to fetch insight:", {
          status: insightRes.status,
          statusText: insightRes.statusText,
          response: insightText.substring(0, 200),
        });
        return [];
      }

      const data = JSON.parse(insightText);
      const result = Array.isArray(data.result) ? data.result[0] : null;
      const dates = result?.labels.slice(-7);
      const dataPoints = result?.data;
      const latest = Array.isArray(dataPoints) ? dataPoints.slice(-7) : null;
      if (!latest) {
        return [];
      }
      const finalResult = latest.map((_, index) => ({
        date: dates[index],
        count: latest[index],
      }));
      return Array.isArray(latest) && latest.every((n) => typeof n === "number")
        ? finalResult
        : [];
    } catch (e) {
      console.error("Failed to parse insights list:", e);
      return [];
    }
  } catch (error: any) {
    console.error("PostHog Fetch Error:", {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });

    return [];
  }
}
