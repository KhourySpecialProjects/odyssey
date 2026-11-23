import "server-only";
import { postMentorRoute } from "./strapi-route";

// Saved Mentor replies in Strapi (ODY-967): the Next server's calls to
// `backend/src/api/mentor-cached-reply`. Deliberately not a "use server" file:
// these trust their input. No Next cache: `revalidateTag` only clears the
// instance that served the write. Never log `text`.

/** A saved reply as Strapi takes it (backend/src/api/mentor-cached-reply): no student data */
export type CachedReplyRow = {
  key: string;
  slot: string;
  scope: "lesson" | "hint";
  dropletId: number;
  lessonId: number;
  promptVersion: string;
  model: string;
  text: string;
};

/** The saved text; null for none, or when Strapi can't be read (already logged): a miss */
export async function findCachedReply(key: string): Promise<string | null> {
  const result = await postMentorRoute<{ text: string | null }>(
    "mentor-cached-replies/find",
    { key },
  );
  if (!result.ok) return null;
  return typeof result.data.text === "string" && result.data.text
    ? result.data.text
    : null;
}

/** Null when it couldn't be saved (already logged). Never throws. */
export async function storeCachedReply(
  row: CachedReplyRow,
): Promise<{ stored: boolean } | null> {
  const result = await postMentorRoute<{ id: number; stored: boolean }>(
    "mentor-cached-replies/store",
    row,
  );
  if (!result.ok) return null;
  return { stored: result.data.stored === true };
}
