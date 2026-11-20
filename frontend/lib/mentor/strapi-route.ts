import "server-only";
import { readJsonOrNull } from "@/lib/strapi-response";
import { STRAPI_RESPONSE_FORMAT_HEADER } from "@/lib/utils";

export type MentorRouteResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string | null };

/** Typed, so a typo can't become a silent 404 that makes every lookup miss */
export type MentorRoutePath =
  | "mentor-usages/check"
  | "mentor-usages/record"
  | "mentor-cached-replies/find"
  | "mentor-cached-replies/store";

/**
 * Calls one of Mentor's private Strapi routes (`mentor-usages/...`,
 * `mentor-cached-replies/...`) with the service token. Bodies are `{ data }`,
 * not v4 entries, so nothing is flattened. A network failure is status 0.
 */
export async function postMentorRoute<T>(
  path: MentorRoutePath,
  body: object,
): Promise<MentorRouteResult<T>> {
  const url = `${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/${path}`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.STRAPI_ACCESS_TOKEN}`,
        ...STRAPI_RESPONSE_FORMAT_HEADER,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const json = await readJsonOrNull(response).catch(() => null);
    if (!response.ok || !json?.data) {
      const message: string | null = json?.error?.message ?? null;
      console.error(`POST ${url} failed:`, response.status, message);
      return { ok: false, status: response.status, message };
    }
    return { ok: true, data: json.data as T };
  } catch (error) {
    console.error(`POST ${url} failed:`, error);
    return { ok: false, status: 0, message: null };
  }
}
