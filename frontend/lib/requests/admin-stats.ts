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
  const query = qs.stringify({
    filters: before ? { createdAt: { $lt: before } } : {},
    pagination: { pageSize: 1, page: 1 },
  });
  const res = await fetch(`${STRAPI_API_URL}/api/droplets?${query}`, {
    headers: { Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}` },
    cache: "no-store",
  });
  if (!res.ok) return 0;
  const data = await res.json();
  return data?.meta?.pagination?.total ?? 0;
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
    currentUsersRes,
    lastMonthUsersRes,
    currentDroplets,
    lastMonthDroplets,
    currentEnrollmentsRes,
    lastMonthEnrollmentsRes,
    completedEnrollmentsRes,
    lastMonthCompletedRes,
  ] = await Promise.all([
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
    // Completed enrollments (for retention)
    fetchEnrollmentMetadata({
      filters: { isComplete: { $eq: true } },
      pagination: { pageSize: 1, page: 1 },
    }),
    fetchEnrollmentMetadata({
      filters: {
        isComplete: { $eq: true },
        createdAt: { $lt: cutoff },
      },
      pagination: { pageSize: 1, page: 1 },
    }),
  ]);

  const currentUsers = currentUsersRes?.meta?.pagination?.total ?? 0;
  const lastMonthUsers = lastMonthUsersRes?.meta?.pagination?.total ?? 0;

  const currentEnrollments = currentEnrollmentsRes?.meta?.pagination?.total ?? 0;
  const lastMonthEnrollments =
    lastMonthEnrollmentsRes?.meta?.pagination?.total ?? 0;

  const completedEnrollments =
    completedEnrollmentsRes?.meta?.pagination?.total ?? 0;
  const lastMonthCompleted =
    lastMonthCompletedRes?.meta?.pagination?.total ?? 0;

  const currentRetentionPct =
    currentEnrollments === 0
      ? 0
      : Math.round((completedEnrollments / currentEnrollments) * 10000) / 100;

  const lastMonthRetentionPct =
    lastMonthEnrollments === 0
      ? 0
      : Math.round((lastMonthCompleted / lastMonthEnrollments) * 10000) / 100;

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
      lastMonth: Math.round(lastMonthRetentionPct),
      currentPct: `${currentRetentionPct.toFixed(2)}%`,
      lastMonthPct: `${lastMonthRetentionPct.toFixed(2)}%`,
      trend: computeTrend(currentRetentionPct, lastMonthRetentionPct),
    },
  };
}
