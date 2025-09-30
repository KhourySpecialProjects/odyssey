"use server";

import { fetchDroplets } from "./data";
import { fetchEnrollmentMetadata } from "./enrollment";
import { fetchAPI } from "../utils";
import { Droplet, Enrollment } from "@/types";
import { StrapiRequestParams } from "@/types/strapi";

// Function to get all enrollments
async function getCompletedEnrollmentsCount(): Promise<number> {
  const response = await fetchEnrollmentMetadata({
    filters: { isComplete: { $eq: true } },
    pagination: { pageSize: 1, page: 1 },
  });

  return response?.meta?.pagination?.total || 0;
}

// Function to get retention data
export async function getRetentionData() {
  const [enrollmentMetadata, completedCount] = await Promise.all([
    fetchEnrollmentMetadata(),
    getCompletedEnrollmentsCount(),
  ]);

  const totalEnrollments = enrollmentMetadata?.meta?.pagination?.total || 0;
  const completedEnrollments = completedCount;

  // Calculate retention rate
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
