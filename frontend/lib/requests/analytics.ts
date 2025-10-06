"use server";

import { fetchEnrollmentMetadata } from "./enrollment";

/**
 * Gets the count of completed enrollments using the isComplete field
 */
async function getCompletedEnrollmentsCount(): Promise<number> {
  const response = await fetchEnrollmentMetadata({
    filters: {
      isComplete: { $eq: true },
    },
    pagination: { pageSize: 1, page: 1 },
  });

  return response?.meta?.pagination?.total || 0;
}

/**
 * Gets the count of incomplete enrollments
 */
async function getIncompleteEnrollmentsCount(): Promise<number> {
  const response = await fetchEnrollmentMetadata({
    filters: {
      isComplete: { $eq: false },
    },
    pagination: { pageSize: 1, page: 1 },
  });

  return response?.meta?.pagination?.total || 0;
}

/**
 * Retrieves retention data including completion and retention rates
 */
export async function getRetentionData() {
  const [enrollmentMetadata, completedCount, incompleteCount] =
    await Promise.all([
      fetchEnrollmentMetadata(),
      getCompletedEnrollmentsCount(),
      getIncompleteEnrollmentsCount(),
    ]);

  const totalEnrollments = enrollmentMetadata?.meta?.pagination?.total || 0;
  const completedEnrollments = completedCount;
  const incompleteEnrollments = incompleteCount;

  const retentionRate =
    totalEnrollments === 0
      ? 0
      : Math.round((completedEnrollments / totalEnrollments) * 10000) / 100;

  return {
    retentionRate,
    totalEnrollments,
    completedEnrollments,
    incompleteEnrollments,
  };
}
