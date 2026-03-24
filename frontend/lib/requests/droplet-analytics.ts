"use server";

import { fetchEnrollmentMetadata } from "./enrollment";

export interface DropletAnalyticsData {
  totalEnrolled: number;
  completedCount: number;
  completionRate: number;
  lessonCompletion: { name: string; count: number }[];
}

export async function getDropletAnalytics(
  dropletId: number,
  lessons: { id: number; name: string }[],
): Promise<DropletAnalyticsData> {
  const [totalRes, completedRes, ...lessonRess] = await Promise.all([
    fetchEnrollmentMetadata({
      filters: { droplet: { id: { $eq: dropletId } } },
      pagination: { pageSize: 1, page: 1 },
    }),
    fetchEnrollmentMetadata({
      filters: {
        droplet: { id: { $eq: dropletId } },
        isComplete: { $eq: true },
      },
      pagination: { pageSize: 1, page: 1 },
    }),
    ...lessons.map((lesson) =>
      fetchEnrollmentMetadata({
        filters: {
          droplet: { id: { $eq: dropletId } },
          viewedLessons: { id: { $eq: lesson.id } },
        },
        pagination: { pageSize: 1, page: 1 },
      }),
    ),
  ]);

  const totalEnrolled = totalRes?.meta?.pagination?.total ?? 0;
  const completedCount = completedRes?.meta?.pagination?.total ?? 0;
  const completionRate =
    totalEnrolled === 0
      ? 0
      : Math.round((completedCount / totalEnrolled) * 10000) / 100;

  const lessonCompletion = lessons.map((lesson, i) => ({
    name: lesson.name,
    count: lessonRess[i]?.meta?.pagination?.total ?? 0,
  }));

  return { totalEnrolled, completedCount, completionRate, lessonCompletion };
}
