// Deliberately not a "use server" file: this raw delete does no auth, so it must
// never be a public action. The guarded `deleteLesson` action in `lesson.ts`
// wraps it, and server-side callers (deepDeleteDroplet, publish) import it directly.
import { STRAPI_RESPONSE_FORMAT_HEADER } from "../utils";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import {
  strapiEntryUrl,
  StrapiEntryNotFoundError,
} from "@/lib/strapi-document-id";
import { readJsonOrNull } from "@/lib/strapi-response";

const STRAPI_ACCESS_TOKEN = process.env.STRAPI_ACCESS_TOKEN;

export async function deleteLessonRecord(
  id: number,
  revalidate: boolean = true,
) {
  try {
    const response = await fetch(await strapiEntryUrl("lessons", id), {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + STRAPI_ACCESS_TOKEN,
        ...STRAPI_RESPONSE_FORMAT_HEADER,
      },
    });
    const body = await readJsonOrNull(response);
    if (!response.ok || body?.error)
      return {
        ok: false,
        error: body?.error?.message ?? "Failed to delete lesson.",
        data: null,
      };

    if (revalidate) {
      revalidateTag(CACHE_TAGS.droplets);
      revalidateTag(CACHE_TAGS.allEnrollments);
      revalidateTag(CACHE_TAGS.lesson);
    }

    return { ok: true, error: null, data: body?.data ?? null };
  } catch (err) {
    // Same result as the 404 Strapi used to return for a missing lesson.
    if (err instanceof StrapiEntryNotFoundError) {
      return { ok: false, error: "Not Found", data: null };
    }
    console.error(err);
    return { error: "Database Error: Failed to Delete Lesson." };
  }
}
