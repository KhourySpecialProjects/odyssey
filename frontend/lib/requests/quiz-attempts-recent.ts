import "server-only";
import type { RecentQuizAttempt } from "@/lib/mentor/learner";
import { STRAPI_RESPONSE_FORMAT_HEADER } from "@/lib/utils";

/**
 * A student's quiz attempts from the last 30 days (ODY-939), or null on any
 * failure. Server-only, never "use server": the id must come from the session.
 */
export async function getRecentQuizAttempts(
  userId: number,
): Promise<RecentQuizAttempt[] | null> {
  const url = `${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/quiz-attempts/recent?userId=${userId}`;
  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${process.env.STRAPI_ACCESS_TOKEN}`,
        ...STRAPI_RESPONSE_FORMAT_HEADER,
      },
      cache: "no-store",
      // A hung Strapi must not delay a Mentor reply.
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) {
      console.warn("recent quiz attempts failed:", response.status);
      return null;
    }
    const json = await response.json();
    return Array.isArray(json?.data)
      ? json.data.filter((row: unknown) => row && typeof row === "object")
      : null;
  } catch (error) {
    console.warn(
      "recent quiz attempts failed:",
      error instanceof Error ? error.name : "unknown",
    );
    return null;
  }
}
