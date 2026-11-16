import "server-only";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { strapiEntryUrl } from "@/lib/strapi-document-id";
import { fetchAPI, STRAPI_RESPONSE_FORMAT_HEADER } from "@/lib/utils";
import {
  FOCUS_AREAS,
  LearnerProfileInputSchema,
} from "@/lib/validations/learner-profile";
import type { AuthUser } from "@/lib/auth/guards";
import type { FocusArea, LearnerProfile, LearnerProfileInput } from "@/types";

// A student's quiz answers (ODY-953). Trusts the user it's given: call it with
// the session user. Never a "use server" file, which would expose it to browsers.

const SAVE_FAILED = "Couldn't save your answers." as const;

type SaveResult =
  | { ok: true; error: null }
  | {
      ok: false;
      error: "invalid_input" | "unknown_tag" | typeof SAVE_FAILED;
    };

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
      filters: { key: { $eq: String(userId) } },
      fields: ["id"],
      sort: ["id:asc"],
      pagination: { page: 1, pageSize: 1 },
    },
    cache: "no-store",
  });
  return rows?.[0] ?? null;
}

const TAG_PAGE_SIZE = 100;

/** Maps tag ids to documentIds from the full tag list, so no student id is in a URL. */
async function tagDocumentIds(ids: number[]): Promise<string[] | null> {
  const byId = new Map<number, string>();
  for (let page = 1; ; page++) {
    const tags = await fetchAPI<{ id: number; documentId: string }[] | null>(
      "/tags",
      {
        urlParams: {
          fields: ["id"],
          pagination: { pageSize: TAG_PAGE_SIZE, page },
        },
        next: { tags: [CACHE_TAGS.tags], revalidate: 900 },
      },
    );
    (tags ?? []).forEach((t) => byId.set(t.id, t.documentId));
    if ((tags?.length ?? 0) < TAG_PAGE_SIZE) break;
  }
  const docs = ids.map((id) => byId.get(id));
  return docs.every((d): d is string => !!d) ? docs : null;
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

  let profileAttempted = false;
  try {
    const data: Record<string, unknown> = { ...rest };
    if (interestTagIds) {
      const docs = interestTagIds.length
        ? await tagDocumentIds(interestTagIds)
        : [];
      if (!docs) return { ok: false, error: "unknown_tag" };
      data.interests = { set: docs };
    }

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
    if (!self) {
      console.error("saveLearnerProfile failed: no user row");
      throw new SaveFailed();
    }

    const existing = await findRow(user.id);
    const base = process.env.NEXT_PUBLIC_STRAPI_API_URL;
    profileAttempted = true;
    if (existing) {
      await putRow(existing, data);
    } else {
      const created = await write("POST", `${base}/api/learner-profiles`, {
        ...data,
        key: String(user.id),
        user: self.documentId,
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
    if (!(error instanceof SaveFailed)) {
      console.error("saveLearnerProfile failed:", (error as Error)?.name);
    }
    if (profileAttempted) revalidateTag(CACHE_TAGS.learnerProfile(user.id));
    return { ok: false, error: SAVE_FAILED };
  }
}
