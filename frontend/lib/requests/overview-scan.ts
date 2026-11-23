"use server";

import { revalidateTag } from "next/cache";
import { assertOwner, withAuth, type AuthUser } from "@/lib/auth/guards";
import { isValidId } from "@/lib/auth/valid-id";
import { SCAN_BYPASS_ROLES } from "@/lib/overview-scan/access";
import { isFrozenFor } from "@/lib/review-roles";
import { readJsonOrNull } from "@/lib/strapi-response";
import { scanFlagKeySchema } from "@/lib/validations/overview-scan";
import {
  checkRateLimit,
  formatRateLimitError,
} from "@/lib/import/rate-limiter";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { scanDroplet } from "@/lib/overview-scan/scan";
import { resolveDocumentId, strapiEntryUrl } from "@/lib/strapi-document-id";
import {
  fetchAPI,
  flattenAttributes,
  STRAPI_RESPONSE_FORMAT_HEADER,
} from "@/lib/utils";
import type {
  OverviewScan,
  ScanDismissal,
  ScanFlagKey,
} from "@/lib/overview-scan/types";

const STRAPI_API_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL;
const STRAPI_ACCESS_TOKEN = process.env.STRAPI_ACCESS_TOKEN;

export type OverviewScanError =
  | "unauthenticated"
  | "forbidden"
  | "invalid_input"
  | "not_found"
  | "rate_limited"
  | "in_review"
  | "stale"
  | "failed";

export type OverviewScanResult<T> =
  | { ok: true; error: null; data: T }
  | { ok: false; error: OverviewScanError; data: null; message?: string };

type ScanTarget = { id: number; documentId?: string };

/** Fresh ownership read: the only Strapi read a refused caller causes. */
async function loadScanTarget(
  user: AuthUser,
  dropletId: number,
): Promise<
  | { ok: true; droplet: ScanTarget; isAuthor: boolean; inReview: boolean }
  | { ok: false; error: "not_found" | "forbidden" }
> {
  const droplets = await fetchAPI<
    | (ScanTarget & {
        inReview?: boolean | null;
        authorized_users?: { id: number }[] | null;
      })[]
    | null
  >("/droplets", {
    urlParams: {
      filters: { id: { $eq: dropletId } },
      fields: ["id", "inReview"],
      populate: { authorized_users: { fields: ["id"] } },
      pagination: { pageSize: 1 },
    },
    cache: "no-store",
  });
  const droplet = droplets?.[0];
  if (!droplet) return { ok: false, error: "not_found" };
  const owner = assertOwner(
    (droplet.authorized_users ?? []).map((u) => u.id),
    user,
    { bypassRoles: SCAN_BYPASS_ROLES },
  );
  if (!owner.ok) return { ok: false, error: "forbidden" };
  return {
    ok: true,
    droplet: { id: droplet.id, documentId: droplet.documentId },
    isAuthor: (droplet.authorized_users ?? []).some((u) => u.id === user.id),
    inReview: !!droplet.inReview,
  };
}

/**
 * Scans the droplet as saved right now and stores the result. For its authors
 * and System Admins, Faculty and Content Editors; 10 runs an hour.
 */
export async function runOverviewScan(
  dropletId: number,
): Promise<OverviewScanResult<OverviewScan>> {
  return withAuth([], async (user) => {
    try {
      if (!isValidId(dropletId)) {
        return { ok: false, error: "invalid_input", data: null };
      }
      const target = await loadScanTarget(user, dropletId);
      if (!target.ok) return { ok: false, error: target.error, data: null };

      const limit = checkRateLimit(user.email, user.roles, "overview-scan");
      if (!limit.allowed) {
        return {
          ok: false,
          error: "rate_limited",
          data: null,
          message: formatRateLimitError(limit.retryAfterMs ?? 0),
        };
      }

      const ranAt = new Date().toISOString();
      const run = await scanDroplet(dropletId);

      const res = await fetch(`${STRAPI_API_URL}/api/overview-scans`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
          ...STRAPI_RESPONSE_FORMAT_HEADER,
        },
        body: JSON.stringify({
          data: {
            droplet: await resolveDocumentId("droplets", target.droplet),
            ranBy: await resolveDocumentId("authorized-users", {
              id: user.id,
              documentId: user.documentId,
            }),
            ranAt,
            rulesVersion: run.rulesVersion,
            passed: run.passed,
            needsAttention: run.needsAttention,
            couldNotCheck: run.couldNotCheck,
            results: run.results,
          },
        }),
      });
      if (!res.ok) {
        console.error("runOverviewScan save failed:", res.status);
        return { ok: false, error: "failed", data: null };
      }

      revalidateTag(CACHE_TAGS.overviewScan(dropletId));
      const json = await res.json();
      return {
        ok: true,
        error: null,
        data: flattenAttributes(json.data) as OverviewScan,
      };
    } catch (error) {
      console.error("runOverviewScan failed:", error);
      return { ok: false, error: "failed", data: null };
    }
  });
}

/** The droplet's newest saved scan, or null. Same callers as runOverviewScan. */
export async function getLatestOverviewScan(
  dropletId: number,
): Promise<OverviewScanResult<OverviewScan | null>> {
  return withAuth([], async (user) => {
    try {
      if (!isValidId(dropletId)) {
        return { ok: false, error: "invalid_input", data: null };
      }
      const target = await loadScanTarget(user, dropletId);
      if (!target.ok) return { ok: false, error: target.error, data: null };

      const rows = await fetchAPI<OverviewScan[] | null>("/overview-scans", {
        urlParams: {
          filters: { droplet: { id: { $eq: dropletId } } },
          sort: ["ranAt:desc", "id:desc"],
          pagination: { pageSize: 1 },
          populate: { ranBy: { fields: ["firstName", "lastName"] } },
        },
        next: { tags: [CACHE_TAGS.overviewScan(dropletId)], revalidate: 900 },
      });
      return { ok: true, error: null, data: rows?.[0] ?? null };
    } catch (error) {
      console.error("getLatestOverviewScan failed:", error);
      return { ok: false, error: "failed", data: null };
    }
  });
}

type DismissalRow = ScanFlagKey & {
  id: number;
  documentId?: string;
  createdAt: string;
  dismissedBy?: { firstName?: string | null; lastName?: string | null } | null;
};

const DISMISSAL_FIELDS = [
  "checkId",
  "ruleId",
  "partId",
  "blockId",
  "message",
  "createdAt",
];

/** Strapi filters for the dismissals of one flag on one droplet. */
const keyFilters = (dropletId: number, key: ScanFlagKey) => ({
  droplet: { id: { $eq: dropletId } },
  checkId: { $eq: key.checkId },
  ruleId: { $eq: key.ruleId },
  partId: { $eq: key.partId },
  blockId: key.blockId === null ? { $null: true } : { $eq: key.blockId },
  message: { $eq: key.message },
});

type DismissTarget =
  | { ok: true; dropletId: number; target: ScanTarget; key: ScanFlagKey }
  | { ok: false; error: OverviewScanError };

/**
 * Checks a dismiss or undo: the scan's own rights, then the review freeze, so
 * an author can't clear flags while a reviewer reads the scan (ODY-905).
 */
async function checkDismissTarget(
  user: AuthUser,
  dropletId: number,
  rawKey: unknown,
): Promise<DismissTarget> {
  if (!isValidId(dropletId)) return { ok: false, error: "invalid_input" };
  const parsed = scanFlagKeySchema.safeParse(rawKey);
  if (!parsed.success) return { ok: false, error: "invalid_input" };
  const target = await loadScanTarget(user, dropletId);
  if (!target.ok) return { ok: false, error: target.error };
  if (isFrozenFor(user.roles, target.inReview, target.isAuthor)) {
    return { ok: false, error: "in_review" };
  }
  return { ok: true, dropletId, target: target.droplet, key: parsed.data };
}

async function findDismissals(
  dropletId: number,
  key: ScanFlagKey,
  pageSize: number,
): Promise<DismissalRow[]> {
  const rows = await fetchAPI<DismissalRow[] | null>(
    "/overview-scan-dismissals",
    {
      urlParams: {
        filters: keyFilters(dropletId, key),
        fields: DISMISSAL_FIELDS,
        pagination: { pageSize },
      },
      cache: "no-store",
    },
  );
  return rows ?? [];
}

/**
 * The flags marked as fine on this droplet (ODY-905), oldest first, and
 * whether the caller may dismiss or undo. Same callers as the scan; reading
 * ignores the review freeze, as scanning does.
 */
export async function getScanDismissals(
  dropletId: number,
): Promise<
  OverviewScanResult<{ dismissals: ScanDismissal[]; canDismiss: boolean }>
> {
  return withAuth([], async (user) => {
    try {
      if (!isValidId(dropletId)) {
        return { ok: false, error: "invalid_input", data: null };
      }
      const target = await loadScanTarget(user, dropletId);
      if (!target.ok) return { ok: false, error: target.error, data: null };

      const rows = await fetchAPI<DismissalRow[] | null>(
        "/overview-scan-dismissals",
        {
          urlParams: {
            filters: { droplet: { id: { $eq: dropletId } } },
            fields: DISMISSAL_FIELDS,
            populate: { dismissedBy: { fields: ["firstName", "lastName"] } },
            sort: ["createdAt:asc", "id:asc"],
            // REST's default page is 25
            pagination: { pageSize: 1000 },
          },
          next: { tags: [CACHE_TAGS.overviewScan(dropletId)], revalidate: 900 },
        },
      );
      const dismissals = (rows ?? []).map(
        (r): ScanDismissal => ({
          checkId: r.checkId,
          ruleId: r.ruleId,
          partId: r.partId,
          blockId: r.blockId ?? null,
          message: r.message,
          dismissedAt: r.createdAt,
          dismissedBy:
            [r.dismissedBy?.firstName, r.dismissedBy?.lastName]
              .filter(Boolean)
              .join(" ")
              .trim() || null,
        }),
      );
      return {
        ok: true,
        error: null,
        data: {
          dismissals,
          canDismiss: !isFrozenFor(
            user.roles,
            target.inReview,
            target.isAuthor,
          ),
        },
      };
    } catch (error) {
      console.error("getScanDismissals failed:", error);
      return { ok: false, error: "failed", data: null };
    }
  });
}

/**
 * Marks one flag of the latest scan as fine, for everyone (ODY-905). Refused
 * with `stale` when the latest scan has no such flag, so only real flags are
 * saved. Dismissing a flag twice changes nothing.
 */
export async function dismissScanFlag(
  dropletId: number,
  key: ScanFlagKey,
): Promise<OverviewScanResult<null>> {
  return withAuth([], async (user) => {
    try {
      const checked = await checkDismissTarget(user, dropletId, key);
      if (!checked.ok) return { ok: false, error: checked.error, data: null };
      const { key: flagKey, target } = checked;

      const scans = await fetchAPI<
        Pick<OverviewScan, "id" | "results">[] | null
      >("/overview-scans", {
        urlParams: {
          filters: { droplet: { id: { $eq: dropletId } } },
          fields: ["results"],
          sort: ["ranAt:desc", "id:desc"],
          pagination: { pageSize: 1 },
        },
        cache: "no-store",
      });
      const flagged = scans?.[0]?.results
        ?.find((c) => c.id === flagKey.checkId)
        ?.rules.find((r) => r.id === flagKey.ruleId)
        ?.flags.some(
          (f) =>
            f.partId === flagKey.partId &&
            (f.blockId ?? null) === flagKey.blockId &&
            f.message === flagKey.message,
        );
      if (!flagged) return { ok: false, error: "stale", data: null };

      if ((await findDismissals(dropletId, flagKey, 1)).length > 0) {
        return { ok: true, error: null, data: null };
      }

      const res = await fetch(
        `${STRAPI_API_URL}/api/overview-scan-dismissals`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
            ...STRAPI_RESPONSE_FORMAT_HEADER,
          },
          body: JSON.stringify({
            data: {
              ...flagKey,
              droplet: await resolveDocumentId("droplets", target),
              dismissedBy: await resolveDocumentId("authorized-users", {
                id: user.id,
                documentId: user.documentId,
              }),
            },
          }),
        },
      );
      if (!res.ok) {
        console.error("dismissScanFlag save failed:", res.status);
        return { ok: false, error: "failed", data: null };
      }
      revalidateTag(CACHE_TAGS.overviewScan(dropletId));
      return { ok: true, error: null, data: null };
    } catch (error) {
      console.error("dismissScanFlag failed:", error);
      return { ok: false, error: "failed", data: null };
    }
  });
}

/** Brings a dismissed flag back for everyone (ODY-905). Same rights as dismissing. */
export async function undoScanFlagDismissal(
  dropletId: number,
  key: ScanFlagKey,
): Promise<OverviewScanResult<null>> {
  return withAuth([], async (user) => {
    try {
      const checked = await checkDismissTarget(user, dropletId, key);
      if (!checked.ok) return { ok: false, error: checked.error, data: null };

      // Two people dismissing at once can leave two rows: remove them all
      const rows = await findDismissals(dropletId, checked.key, 100);
      for (const row of rows) {
        const res = await fetch(
          await strapiEntryUrl("overview-scan-dismissals", row),
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
              ...STRAPI_RESPONSE_FORMAT_HEADER,
            },
          },
        );
        if (!res.ok && res.status !== 404) {
          const body = await readJsonOrNull(res).catch(() => null);
          console.error(
            "undoScanFlagDismissal delete failed:",
            res.status,
            body?.error?.message ?? null,
          );
          return { ok: false, error: "failed", data: null };
        }
      }
      if (rows.length) revalidateTag(CACHE_TAGS.overviewScan(dropletId));
      return { ok: true, error: null, data: null };
    } catch (error) {
      console.error("undoScanFlagDismissal failed:", error);
      return { ok: false, error: "failed", data: null };
    }
  });
}
