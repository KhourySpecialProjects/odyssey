import "server-only";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import {
  resolveDocumentId,
  resolveDocumentIds,
  strapiEntryUrl,
  StrapiEntryNotFoundError,
} from "@/lib/strapi-document-id";
import { fetchAPI, STRAPI_RESPONSE_FORMAT_HEADER } from "@/lib/utils";
import {
  FOCUS_AREAS,
  LearnerProfileInputSchema,
} from "@/lib/validations/learner-profile";
import type { AuthUser } from "@/lib/auth/guards";
import type { FocusArea, LearnerProfile, LearnerProfileInput } from "@/types";

// A student's quiz answers (ODY-953). Trusts the user it's given: call it with
// the session user. Never a "use server" file, which would expose it to browsers.

type SaveResult =
  | { ok: true; error: null }
  | {
      ok: false;
      error: "invalid_input" | "unknown_tag" | "Couldn't save your answers.";
    };

const SAVE_FAILED = "Couldn't save your answers." as const;

class SaveFailed extends Error {}

type Row = { id: number; documentId: string };

/** The student's answers, or null when they've never saved any. Throws if Strapi fails. */
export async function getLearnerProfile(
  userId: number,
): Promise<LearnerProfile | null> {
  const rows = await fetchAPI<
    | (Partial<Omit<LearnerProfile, "focusAreas">> & {
        id: number;
        focusAreas?: unknown;
      })[]
    | null
  >("/learner-profiles", {
    urlParams: {
      filters: { user: { id: { $eq: userId } } },
      fields: ["goal", "focusAreas", "interestNote"],
      populate: { interests: { fields: ["name", "slug"] } },
      sort: ["id:asc"],
      pagination: { page: 1, pageSize: 1 },
    },
    next: { tags: [CACHE_TAGS.learnerProfile(userId)], revalidate: 900 },
  });
  const row = rows?.[0];
  if (!row) return null;
  const areas = Array.isArray(row.focusAreas) ? row.focusAreas : [];
  return {
    id: row.id,
    documentId: row.documentId,
    goal: row.goal ?? null,
    focusAreas: areas.filter((a): a is FocusArea =>
      (FOCUS_AREAS as readonly unknown[]).includes(a),
    ),
    interests: row.interests ?? [],
    interestNote: row.interestNote ?? null,
  };
}

async function findRow(userId: number): Promise<Row | null> {
  const rows = await fetchAPI<Row[] | null>("/learner-profiles", {
    urlParams: {
      filters: { user: { id: { $eq: userId } } },
      fields: ["id"],
      sort: ["id:asc"],
      pagination: { page: 1, pageSize: 1 },
    },
    cache: "no-store",
  });
  return rows?.[0] ?? null;
}

async function write(
  method: "POST" | "PUT",
  url: string,
  data: Record<string, unknown>,
): Promise<Response> {
  return fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.STRAPI_ACCESS_TOKEN}`,
      ...STRAPI_RESPONSE_FORMAT_HEADER,
    },
    body: JSON.stringify({ data }),
    cache: "no-store",
  });
}

function requireOk(response: Response): void {
  if (response.ok) return;
  console.error("saveLearnerProfile failed:", response.status);
  throw new SaveFailed();
}

async function putRow(row: Row, data: Record<string, unknown>) {
  const url = await strapiEntryUrl("learner-profiles", {
    documentId: row.documentId,
  });
  requireOk(await write("PUT", url, data));
}

/** Saves the given answers and marks the student onboarded. Omitted keys stay as they are. */
export async function saveLearnerProfile(
  user: Pick<AuthUser, "id" | "email">,
  input: LearnerProfileInput,
): Promise<SaveResult> {
  const parsed = LearnerProfileInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };
  const { interestTagIds, ...rest } = parsed.data;

  let profileWritten = false;
  try {
    const data: Record<string, unknown> = { ...rest };
    if (interestTagIds) {
      data.interests = {
        set: await resolveDocumentIds("tags", interestTagIds),
      };
    }

    const existing = await findRow(user.id);
    const base = process.env.NEXT_PUBLIC_STRAPI_API_URL;
    if (existing) {
      await putRow(existing, data);
    } else {
      const created = await write("POST", `${base}/api/learner-profiles`, {
        ...data,
        key: String(user.id),
        user: await resolveDocumentId("authorized-users", user.id),
      });
      if (!created.ok) {
        const raced = await findRow(user.id);
        if (!raced) {
          console.error("saveLearnerProfile failed:", created.status);
          throw new SaveFailed();
        }
        await putRow(raced, data);
      }
    }
    profileWritten = true;

    const users = await fetchAPI<
      { documentId: string; onboardedAt?: string | null }[] | null
    >("/authorized-users", {
      urlParams: {
        filters: { id: { $eq: user.id } },
        fields: ["onboardedAt"],
      },
      cache: "no-store",
    });
    const self = users?.[0];
    if (!self) throw new SaveFailed();
    if (!self.onboardedAt) {
      const url = await strapiEntryUrl("authorized-users", {
        documentId: self.documentId,
      });
      requireOk(
        await write("PUT", url, { onboardedAt: new Date().toISOString() }),
      );
    }

    revalidateTag(CACHE_TAGS.learnerProfile(user.id));
    revalidateTag(CACHE_TAGS.user(user.email));
    return { ok: true, error: null };
  } catch (error) {
    if (error instanceof StrapiEntryNotFoundError) {
      return { ok: false, error: "unknown_tag" };
    }
    if (!(error instanceof SaveFailed)) {
      console.error("saveLearnerProfile failed:", (error as Error)?.name);
    }
    if (profileWritten) revalidateTag(CACHE_TAGS.learnerProfile(user.id));
    return { ok: false, error: SAVE_FAILED };
  }
}
