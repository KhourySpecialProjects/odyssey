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
  const [totalRes, completedRes] = await Promise.all([
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
  ]);

  const totalEnrolled = totalRes?.meta?.pagination?.total ?? 0;
  const completedCount = completedRes?.meta?.pagination?.total ?? 0;
  const completionRate =
    totalEnrolled === 0
      ? 0
      : Math.round((completedCount / totalEnrolled) * 10000) / 100;

  // Build per-lesson view counts by fetching all enrollments with viewedLessons
  // populated and counting client-side. Filtering by viewedLessons relation ID
  // via the Strapi REST API is unreliable for many-to-many — this matches the
  // established pattern used by StudentProgress and getEnrollmentsForGroupMembers.
  const lessonViewCounts = new Map<number, number>(
    lessons.map((l) => [l.id, 0]),
  );

  if (lessons.length > 0 && totalEnrolled > 0) {
    const pageSize = 250;
    let page = 1;
    while (true) {
      const res = await fetchEnrollmentMetadata({
        filters: { droplet: { id: { $eq: dropletId } } },
        pagination: { pageSize, page },
        populate: { viewedLessons: { fields: ["id"] } },
        fields: ["id"],
      });

      // res.data comes back as raw Strapi objects (flattenResponse: false)
      const raw = (res.data ?? []) as unknown as {
        id: number;
        attributes: { viewedLessons: { data: { id: number }[] } };
      }[];

      for (const enrollment of raw) {
        for (const lesson of enrollment.attributes?.viewedLessons?.data ?? []) {
          if (lessonViewCounts.has(lesson.id)) {
            lessonViewCounts.set(
              lesson.id,
              (lessonViewCounts.get(lesson.id) ?? 0) + 1,
            );
          }
        }
      }

      if (raw.length < pageSize) break;
      page++;
    }
  }

  const lessonCompletion = lessons.map((lesson) => ({
    name: lesson.name,
    count: lessonViewCounts.get(lesson.id) ?? 0,
  }));

  // Scroll depth: approximate per-lesson drop-off curve.
  // Started = totalEnrolled, 25% = lesson view count, 100% = droplet completions.
  const scrollDepth: LessonScrollDepth[] = lessons.map((lesson) => {
    const viewed = lessonViewCounts.get(lesson.id) ?? 0;
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
