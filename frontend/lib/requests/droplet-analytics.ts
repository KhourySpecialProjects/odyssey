"use server";

import { fetchEnrollmentMetadata } from "./enrollment";

export interface ScrollDepthPoint {
  label: string;
  count: number;
}

export interface LessonScrollDepth {
  lessonId: number;
  lessonName: string;
  points: ScrollDepthPoint[];
}

export interface DropletAnalyticsData {
  totalEnrolled: number;
  completedCount: number;
  completionRate: number;
  lessonCompletion: { name: string; count: number }[];
  scrollDepth: LessonScrollDepth[];
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

  // Scroll depth: approximate per-lesson drop-off curve using real data at
  // the endpoints (started = totalEnrolled, 25% = lesson viewed, 100% = completed)
  // with linear interpolation for the midpoints.
  const scrollDepth: LessonScrollDepth[] = lessons.map((lesson, i) => {
    const viewed = lessonRess[i]?.meta?.pagination?.total ?? 0;
    const p25 = viewed;
    const p100 = completedCount;
    const p50 = Math.round(p25 - (p25 - p100) * 0.33);
    const p75 = Math.round(p25 - (p25 - p100) * 0.67);
    return {
      lessonId: lesson.id,
      lessonName: lesson.name,
      points: [
        { label: "Started", count: totalEnrolled },
        { label: "25%", count: p25 },
        { label: "50%", count: p50 },
        { label: "75%", count: p75 },
        { label: "100%", count: p100 },
      ],
    };
  });

  return {
    totalEnrolled,
    completedCount,
    completionRate,
    lessonCompletion,
    scrollDepth,
  };
}
