import { assertOwner, type AuthUser } from "@/lib/auth/guards";
import { AuthorizedUserRoleTitle as Role } from "@/lib/globals";
import {
  REVIEW_FROZEN_ERROR,
  isFrozenFor,
  isReviewerFor,
  type LessonReviewState,
} from "@/lib/review-roles";
import { fetchAPI } from "@/lib/utils";
import { isValidId } from "@/lib/auth/valid-id";

/**
 * Server-side review-freeze checks. Not a "use server" file and never imported
 * by client code. Every check returns a result and never throws, so it can be
 * called from `withAuth` handlers (which don't catch).
 */

export type FreezeError =
  | "forbidden"
  | typeof REVIEW_FROZEN_ERROR
  | "Not Found"
  | "Could not verify edit access.";

export type FreezeResult = { ok: true } | { ok: false; error: FreezeError };

export type DropletForWrite = {
  id: number;
  name: string;
  inReview: boolean;
  originalDropletId: number | null;
  ownerIds: number[];
};

const WRITE_BYPASS_ROLES = [Role.SysAdmin, Role.Faculty, Role.ContentEditor];
const DROPLET_FIELDS = [
  "id",
  "name",
  "inReview",
  "status",
  "originalDropletId",
];
const DROPLET_POPULATE = { authorized_users: { fields: ["id"] } };
const ONE = { pageSize: 1, page: 1 };

const OK: FreezeResult = { ok: true };
const fail = (error: FreezeError): FreezeResult => ({ ok: false, error });
const LOOKUP_FAILED = fail("Could not verify edit access.");

type RawDroplet = {
  id: number;
  name?: string | null;
  inReview?: boolean | null;
  originalDropletId?: number | null;
  authorized_users?: { id: number }[] | null;
};

function toShape(raw: RawDroplet): DropletForWrite {
  return {
    id: raw.id,
    name: raw.name ?? "",
    inReview: !!raw.inReview,
    originalDropletId: raw.originalDropletId ?? null,
    ownerIds: (raw.authorized_users ?? []).map((u) => u.id),
  };
}

/** Review keys are inReview, status and afterReview; everything else is content. */
export function classifyDropletChange(
  data: Record<string, unknown>,
  stored: { name?: string },
  options: { regenerateSlug?: boolean } = {},
): { status: boolean; content: boolean; inReview: boolean | undefined } {
  let status = false;
  // Regenerating the slug rewrites the droplet's URL, so it is a content change
  // even when the payload itself is only a status change.
  let content = !!options.regenerateSlug;
  let inReview: boolean | undefined;
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    if (key === "status" || key === "afterReview") status = true;
    else if (key === "inReview") inReview = !!value;
    else if (key === "name" && value === stored.name) continue;
    else content = true;
  }
  return { status, content, inReview };
}

export async function loadDropletForWrite(
  id: number,
): Promise<DropletForWrite | null> {
  const droplets = await fetchAPI<RawDroplet[]>("/droplets", {
    urlParams: {
      filters: { id: { $eq: id } },
      fields: DROPLET_FIELDS,
      populate: DROPLET_POPULATE,
      pagination: ONE,
    },
    cache: "no-store",
  });
  const droplet = droplets?.[0];
  return droplet ? toShape(droplet) : null;
}

export async function loadLessonDroplets(
  lessonId: number,
): Promise<DropletForWrite[] | null> {
  const lessons = await fetchAPI<
    { id: number; droplets?: RawDroplet[] | null }[]
  >("/lessons", {
    urlParams: {
      filters: { id: { $eq: lessonId } },
      fields: ["id"],
      populate: {
        droplets: { fields: DROPLET_FIELDS, populate: DROPLET_POPULATE },
      },
      pagination: ONE,
    },
    cache: "no-store",
  });
  const lesson = lessons?.[0];
  return lesson ? (lesson.droplets ?? []).map(toShape) : null;
}

export async function loadDatasetDroplet(
  datasetId: number,
): Promise<{ droplet: DropletForWrite | null } | null> {
  const datasets = await fetchAPI<
    { id: number; droplet?: RawDroplet | null }[]
  >("/datasets", {
    urlParams: {
      filters: { id: { $eq: datasetId } },
      fields: ["id"],
      populate: {
        droplet: { fields: DROPLET_FIELDS, populate: DROPLET_POPULATE },
      },
      pagination: ONE,
    },
    cache: "no-store",
  });
  const dataset = datasets?.[0];
  if (!dataset) return null;
  return { droplet: dataset.droplet ? toShape(dataset.droplet) : null };
}

const hasBypass = (user: AuthUser) =>
  WRITE_BYPASS_ROLES.some((r) => user.roles.includes(r));

/** Write rights for one droplet, then the freeze. */
function checkDropletWrite(
  user: AuthUser,
  droplet: DropletForWrite,
): FreezeResult {
  const isAuthor = droplet.ownerIds.includes(user.id);
  const owner = assertOwner(droplet.ownerIds, user, {
    bypassRoles: WRITE_BYPASS_ROLES,
  });
  if (!owner.ok) return fail("forbidden");
  if (isFrozenFor(user.roles, droplet.inReview, isAuthor)) {
    return fail(REVIEW_FROZEN_ERROR);
  }
  return OK;
}

/** Only Admin and Faculty may write to something with no droplet. */
function checkOrphanWrite(user: AuthUser): FreezeResult {
  return user.roles.includes(Role.SysAdmin) || user.roles.includes(Role.Faculty)
    ? OK
    : fail("forbidden");
}

export async function checkDropletContentWrite(
  user: AuthUser,
  dropletId: number,
): Promise<FreezeResult> {
  if (!isValidId(dropletId)) return fail("forbidden");
  try {
    const droplet = await loadDropletForWrite(dropletId);
    if (!droplet) return fail("Not Found");
    return checkDropletWrite(user, droplet);
  } catch {
    return LOOKUP_FAILED;
  }
}

export async function checkLessonWrite(
  user: AuthUser,
  lessonId: number,
): Promise<FreezeResult> {
  if (!isValidId(lessonId)) return fail("forbidden");
  try {
    const droplets = await loadLessonDroplets(lessonId);
    if (!droplets) return fail("Not Found");
    if (droplets.length === 0) return checkOrphanWrite(user);
    const results = droplets.map((d) => checkDropletWrite(user, d));
    return (
      results.find((r) => !r.ok && r.error === "forbidden") ??
      results.find((r) => !r.ok) ??
      OK
    );
  } catch {
    return LOOKUP_FAILED;
  }
}

export async function checkDatasetWrite(
  user: AuthUser,
  datasetId: number,
): Promise<FreezeResult> {
  if (!isValidId(datasetId)) return fail("forbidden");
  try {
    const dataset = await loadDatasetDroplet(datasetId);
    if (!dataset) return fail("Not Found");
    if (!dataset.droplet) return checkOrphanWrite(user);
    return checkDropletWrite(user, dataset.droplet);
  } catch {
    return LOOKUP_FAILED;
  }
}

export async function checkDropletUpdate(
  user: AuthUser,
  dropletId: number,
  data: Record<string, unknown>,
  options: { regenerateSlug?: boolean } = {},
): Promise<FreezeResult> {
  if (!isValidId(dropletId)) return fail("forbidden");
  try {
    const droplet = await loadDropletForWrite(dropletId);
    if (!droplet) return fail("Not Found");
    const isAuthor = droplet.ownerIds.includes(user.id);
    if (isReviewerFor(user.roles, droplet.inReview, isAuthor)) return OK;

    const change = classifyDropletChange(data, { name: droplet.name }, options);
    if (change.status) return fail("forbidden");
    if (!hasBypass(user) && !isAuthor) return fail("forbidden");

    if (droplet.inReview) {
      if (change.content) return fail(REVIEW_FROZEN_ERROR);
      // Withdraw (inReview: false) and a harmless repeat submit pass.
      return OK;
    }
    return OK;
  } catch {
    return LOOKUP_FAILED;
  }
}

export async function checkPublishDraft(
  user: AuthUser,
  draftId: number,
  originalId: number,
): Promise<FreezeResult> {
  if (!isValidId(draftId) || !isValidId(originalId)) return fail("forbidden");
  try {
    const draft = await loadDropletForWrite(draftId);
    if (!draft) return fail("Not Found");
    if (Number(draft.originalDropletId) !== Number(originalId)) {
      return fail("forbidden");
    }
    const isAuthor = draft.ownerIds.includes(user.id);
    return isReviewerFor(user.roles, draft.inReview, isAuthor)
      ? OK
      : fail("forbidden");
  } catch {
    return LOOKUP_FAILED;
  }
}

/** Review state for a lesson's droplets, or null when it can't be read. */
export async function getLessonReviewState(
  user: AuthUser,
  lessonId: number,
): Promise<LessonReviewState | null> {
  if (!isValidId(lessonId)) return null;
  try {
    const droplets = await loadLessonDroplets(lessonId);
    if (!droplets) return null;
    const inReviewDroplets = droplets.filter((d) => d.inReview);
    const inReview = inReviewDroplets.length > 0;
    return {
      inReview,
      isReviewer:
        inReview &&
        inReviewDroplets.every((d) =>
          isReviewerFor(user.roles, true, d.ownerIds.includes(user.id)),
        ),
    };
  } catch {
    return null;
  }
}
