"use server";

import { revalidateTag } from "next/cache";
import { assertOwner, withAuth, type AuthUser } from "@/lib/auth/guards";
import { isValidId } from "@/lib/auth/valid-id";
import { AuthorizedUserRoleTitle } from "@/lib/globals";
import {
  checkRateLimit,
  formatRateLimitError,
} from "@/lib/import/rate-limiter";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { scanDroplet } from "@/lib/overview-scan/scan";
import { resolveDocumentId } from "@/lib/strapi-document-id";
import {
  fetchAPI,
  flattenAttributes,
  STRAPI_RESPONSE_FORMAT_HEADER,
} from "@/lib/utils";
import type { OverviewScan } from "@/lib/overview-scan/types";

const STRAPI_API_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL;
const STRAPI_ACCESS_TOKEN = process.env.STRAPI_ACCESS_TOKEN;

// Scanning never writes the droplet, so staff who can't edit it may still scan.
const SCAN_BYPASS_ROLES = [
  AuthorizedUserRoleTitle.SysAdmin,
  AuthorizedUserRoleTitle.Faculty,
  AuthorizedUserRoleTitle.ContentEditor,
];

export type OverviewScanError =
  | "unauthenticated"
  | "forbidden"
  | "invalid_input"
  | "not_found"
  | "rate_limited"
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
  | { ok: true; droplet: ScanTarget }
  | { ok: false; error: "not_found" | "forbidden" }
> {
  const droplets = await fetchAPI<
    (ScanTarget & { authorized_users?: { id: number }[] | null })[] | null
  >("/droplets", {
    urlParams: {
      filters: { id: { $eq: dropletId } },
      fields: ["id"],
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
