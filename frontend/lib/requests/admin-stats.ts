"use server";

import qs from "qs";
import { fetchAuthorizedUsersMetadata } from "./authorized-user";
import { fetchEnrollmentMetadata } from "./enrollment";

const STRAPI_API_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL;
const STRAPI_ACCESS_TOKEN = process.env.STRAPI_ACCESS_TOKEN;

/** ISO timestamp for N days ago */
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

/** % change from previous to current, rounded to 2 dp */
function computeTrend(
  current: number,
  previous: number,
): { value: string; direction: "up" | "down" } | undefined {
  if (previous === 0) return undefined;
  const pct = ((current - previous) / previous) * 100;
  return {
    value: `${Math.abs(pct).toFixed(2)}%`,
    direction: pct >= 0 ? "up" : "down",
  };
}

/** Fetch total count of droplets (optionally before a given ISO date) */
async function fetchDropletCount(before?: string): Promise<number> {
  if (!STRAPI_API_URL || !STRAPI_ACCESS_TOKEN) {
    throw new Error(
      "fetchDropletCount: STRAPI_API_URL or STRAPI_ACCESS_TOKEN is not set",
    );
  }
  const query = qs.stringify({
    filters: before ? { createdAt: { $lt: before } } : {},
    pagination: { pageSize: 1, page: 1 },
  });
  try {
    const res = await fetch(`${STRAPI_API_URL}/api/droplets?${query}`, {
      headers: { Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}` },
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `fetchDropletCount: Strapi returned ${res.status} ${res.statusText}${text ? ` — ${text}` : ""}`,
      );
    }
    const data = await res.json();
    return data?.meta?.pagination?.total ?? 0;
  } catch (err) {
    console.error("fetchDropletCount failed:", err);
    throw err;
  }
}

export interface StatCardData {
  current: number;
  lastMonth: number;
  trend?: { value: string; direction: "up" | "down" };
}

export interface AdminDashboardStats {
  users: StatCardData;
  droplets: StatCardData;
  enrollments: StatCardData;
  retentionRate: StatCardData & { currentPct: string; lastMonthPct: string };
}

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const cutoff = daysAgo(30);

  const [
    currentUsersResult,
    lastMonthUsersResult,
    currentDropletsResult,
    lastMonthDropletsResult,
    currentEnrollmentsResult,
    lastMonthEnrollmentsResult,
    completedEnrollmentsResult,
  ] = await Promise.allSettled([
    // Users
    fetchAuthorizedUsersMetadata({ pagination: { pageSize: 1, page: 1 } }),
    fetchAuthorizedUsersMetadata({
      filters: { createdAt: { $lt: cutoff } },
      pagination: { pageSize: 1, page: 1 },
    }),
    // Droplets
    fetchDropletCount(),
    fetchDropletCount(cutoff),
    // Enrollments (all)
    fetchEnrollmentMetadata({ pagination: { pageSize: 1, page: 1 } }),
    fetchEnrollmentMetadata({
      filters: { createdAt: { $lt: cutoff } },
      pagination: { pageSize: 1, page: 1 },
    }),
    // Completed enrollments (for current retention only)
    // lastMonth retention is omitted: no completedAt field exists in the schema,
    // so a historical completion count cannot be computed accurately.
    fetchEnrollmentMetadata({
      filters: { isComplete: { $eq: true } },
      pagination: { pageSize: 1, page: 1 },
    }),
  ]);

  const currentUsersRes =
    currentUsersResult.status === "fulfilled" ? currentUsersResult.value : null;
  const lastMonthUsersRes =
    lastMonthUsersResult.status === "fulfilled"
      ? lastMonthUsersResult.value
      : null;
  const currentDroplets =
    currentDropletsResult.status === "fulfilled"
      ? currentDropletsResult.value
      : 0;
  const lastMonthDroplets =
    lastMonthDropletsResult.status === "fulfilled"
      ? lastMonthDropletsResult.value
      : 0;
  const currentEnrollmentsRes =
    currentEnrollmentsResult.status === "fulfilled"
      ? currentEnrollmentsResult.value
      : null;
  const lastMonthEnrollmentsRes =
    lastMonthEnrollmentsResult.status === "fulfilled"
      ? lastMonthEnrollmentsResult.value
      : null;
  const completedEnrollmentsRes =
    completedEnrollmentsResult.status === "fulfilled"
      ? completedEnrollmentsResult.value
      : null;

  const currentUsers = currentUsersRes?.meta?.pagination?.total ?? 0;
  const lastMonthUsers = lastMonthUsersRes?.meta?.pagination?.total ?? 0;

  const currentEnrollments =
    currentEnrollmentsRes?.meta?.pagination?.total ?? 0;
  const lastMonthEnrollments =
    lastMonthEnrollmentsRes?.meta?.pagination?.total ?? 0;

  const completedEnrollments =
    completedEnrollmentsRes?.meta?.pagination?.total ?? 0;

  const currentRetentionPct =
    currentEnrollments === 0
      ? 0
      : Math.round((completedEnrollments / currentEnrollments) * 10000) / 100;

  return {
    users: {
      current: currentUsers,
      lastMonth: lastMonthUsers,
      trend: computeTrend(currentUsers, lastMonthUsers),
    },
    droplets: {
      current: currentDroplets,
      lastMonth: lastMonthDroplets,
      trend: computeTrend(currentDroplets, lastMonthDroplets),
    },
    enrollments: {
      current: currentEnrollments,
      lastMonth: lastMonthEnrollments,
      trend: computeTrend(currentEnrollments, lastMonthEnrollments),
    },
    retentionRate: {
      current: Math.round(currentRetentionPct),
      lastMonth: 0,
      currentPct: `${currentRetentionPct.toFixed(2)}%`,
      lastMonthPct: "N/A",
      trend: undefined,
    },
  };
}
