"use server";

import { fetchDroplets } from "./data";
import { fetchEnrollmentMetadata } from "./enrollment";
import { fetchAPI } from "../utils";
import { Droplet, Enrollment } from "@/types";
import { StrapiRequestParams } from "@/types/strapi";

/**
 * Returns the total number of enrollments marked as complete.
 *
 * @returns The total count of completed enrollments, or `0` if the count cannot be determined.
 */
async function getCompletedEnrollmentsCount(): Promise<number> {
  const response = await fetchEnrollmentMetadata({
    filters: { isComplete: { $eq: true } },
    pagination: { pageSize: 1, page: 1 },
  });

  return response?.meta?.pagination?.total || 0;
}

/**
 * Compute enrollment retention metrics and return the total enrollments, completed enrollments, and retention rate.
 *
 * @returns An object with:
 * - `retentionRate`: The percentage of enrollments completed, rounded to two decimal places (`0` if `totalEnrollments` is `0`).
 * - `totalEnrollments`: The total number of enrollments.
 * - `completedEnrollments`: The number of enrollments marked as complete.
 */
export async function getRetentionData() {
  const [enrollmentMetadata, completedCount] = await Promise.all([
    fetchEnrollmentMetadata(),
    getCompletedEnrollmentsCount(),
  ]);

  const totalEnrollments = enrollmentMetadata?.meta?.pagination?.total || 0;
  const completedEnrollments = completedCount;

  console.log("Debug - Total enrollments:", totalEnrollments);
  console.log("Debug - Completed enrollments:", completedEnrollments);

  const retentionRate =
    totalEnrollments === 0
      ? 0
      : Math.round((completedEnrollments / totalEnrollments) * 10000) / 100;

  return {
    retentionRate,
    totalEnrollments,
    completedEnrollments,
  };
}
