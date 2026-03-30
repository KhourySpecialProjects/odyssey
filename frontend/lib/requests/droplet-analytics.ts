"use server";

import { fetchEnrollmentMetadata } from "./enrollment";
import { fetchLessonScrollDepth } from "./posthog";

export interface ScrollDepthPoint {
  label: string;
  count: number;
}

export interface LessonScrollDepth {
  lessonId: number;
  lessonName: string;
  points: ScrollDepthPoint[];
  estimated: boolean;
}

export interface DropletAnalyticsData {
  totalEnrolled: number;
  completedCount: number;
  completionRate: number;
  lastMonthEnrolled: number;
  lastMonthCompleted: number;
  lastMonthCompletionRate: number;
  averageRating: number | null;
  lastMonthAverageRating: number | null;
  lessonCompletion: { name: string; count: number }[];
  scrollDepth: LessonScrollDepth[];
}

export async function getDropletAnalytics(
  dropletId: number,
  lessons: { id: number; name: string }[],
): Promise<DropletAnalyticsData> {
  const now = new Date();
  const endOfLastMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    0,
    23,
    59,
    59,
    999,
  ).toISOString();

  const [totalRes, completedRes, lastMonthTotalRes, lastMonthCompletedRes] =
    await Promise.all([
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
      fetchEnrollmentMetadata({
        filters: {
          droplet: { id: { $eq: dropletId } },
          createdAt: { $lte: endOfLastMonth },
        },
        pagination: { pageSize: 1, page: 1 },
      }),
      fetchEnrollmentMetadata({
        filters: {
          droplet: { id: { $eq: dropletId } },
          isComplete: { $eq: true },
          createdAt: { $lte: endOfLastMonth },
        },
        pagination: { pageSize: 1, page: 1 },
      }),
    ]);

  const totalEnrolled = totalRes?.meta?.pagination?.total ?? 0;
  const completedCount = completedRes?.meta?.pagination?.total ?? 0;
  const lastMonthEnrolled = lastMonthTotalRes?.meta?.pagination?.total ?? 0;
  const lastMonthCompleted =
    lastMonthCompletedRes?.meta?.pagination?.total ?? 0;
  const completionRate =
    totalEnrolled === 0
      ? 0
      : Math.round((completedCount / totalEnrolled) * 10000) / 100;
  const lastMonthCompletionRate =
    lastMonthEnrolled === 0
      ? 0
      : Math.round((lastMonthCompleted / lastMonthEnrolled) * 10000) / 100;

  // Build per-lesson view counts by fetching all enrollments with viewedLessons
  // populated and counting client-side. Filtering by viewedLessons relation ID
  // via the Strapi REST API is unreliable for many-to-many — this matches the
  // established pattern used by StudentProgress and getEnrollmentsForGroupMembers.
  const lessonViewCounts = new Map<number, number>(
    lessons.map((l) => [l.id, 0]),
  );

  async function fetchAllEnrollments() {
    let ratingSum = 0;
    let ratingCount = 0;
    if (totalEnrolled > 0) {
      const pageSize = 250;
      let page = 1;
      while (true) {
        const res = await fetchEnrollmentMetadata({
          filters: { droplet: { id: { $eq: dropletId } } },
          pagination: { pageSize, page },
          populate:
            lessons.length > 0
              ? { viewedLessons: { fields: ["id"] } }
              : undefined,
          fields: ["id", "rating"],
        });

        // res.data comes back as raw Strapi objects (flattenResponse: false)
        const raw = (res.data ?? []) as unknown as {
          id: number;
          attributes: {
            rating?: number | null;
            viewedLessons: { data: { id: number }[] };
          };
        }[];

        for (const enrollment of raw) {
          const rating = enrollment.attributes?.rating;
          if (rating != null && rating !== 0) {
            ratingSum += rating;
            ratingCount++;
          }
          if (lessons.length > 0) {
            for (const lesson of enrollment.attributes?.viewedLessons?.data ??
              []) {
              if (lessonViewCounts.has(lesson.id)) {
                lessonViewCounts.set(
                  lesson.id,
                  (lessonViewCounts.get(lesson.id) ?? 0) + 1,
                );
              }
            }
          }
        }

        if (raw.length < pageSize) break;
        page++;
      }
    }
    return ratingCount === 0
      ? null
      : Math.round((ratingSum / ratingCount) * 10) / 10;
  }

  async function fetchLastMonthRating() {
    let lastMonthRatingSum = 0;
    let lastMonthRatingCount = 0;
    if (lastMonthEnrolled > 0) {
      const pageSize = 250;
      let page = 1;
      while (true) {
        const res = await fetchEnrollmentMetadata({
          filters: {
            droplet: { id: { $eq: dropletId } },
            createdAt: { $lte: endOfLastMonth },
          },
          pagination: { pageSize, page },
          fields: ["id", "rating"],
        });

        const raw = (res.data ?? []) as unknown as {
          id: number;
          attributes: { rating?: number | null };
        }[];

        for (const enrollment of raw) {
          const rating = enrollment.attributes?.rating;
          if (rating != null && rating !== 0) {
            lastMonthRatingSum += rating;
            lastMonthRatingCount++;
          }
        }

        if (raw.length < pageSize) break;
        page++;
      }
    }
    return lastMonthRatingCount === 0
      ? null
      : Math.round((lastMonthRatingSum / lastMonthRatingCount) * 10) / 10;
  }

  const [averageRating, lastMonthAverageRating, posthogScrollDepth] =
    await Promise.all([
      fetchAllEnrollments(),
      fetchLastMonthRating(),
      fetchLessonScrollDepth(
        dropletId,
        lessons.map((l) => l.id),
      ),
    ]);

  const lessonCompletion = lessons.map((lesson) => ({
    name: lesson.name,
    count: lessonViewCounts.get(lesson.id) ?? 0,
  }));

  // Scroll depth: use PostHog event counts when available, otherwise fall back
  // to the approximate drop-off curve derived from Strapi enrollment data.
  const scrollDepth: LessonScrollDepth[] = lessons.map((lesson) => {
    const phData = posthogScrollDepth.get(lesson.id);
    if (phData && phData.size > 0) {
      return {
        lessonId: lesson.id,
        lessonName: lesson.name,
        estimated: false,
        points: [
          { label: "Started", count: totalEnrolled },
          { label: "25%", count: phData.get(25) ?? 0 },
          { label: "50%", count: phData.get(50) ?? 0 },
          { label: "75%", count: phData.get(75) ?? 0 },
          { label: "100%", count: phData.get(100) ?? 0 },
        ],
      };
    }
    // Fallback: interpolate from Strapi view/completion counts
    const viewed = lessonViewCounts.get(lesson.id) ?? 0;
    const p25 = viewed;
    const p100 = completedCount;
    const p50 = Math.round(p25 - (p25 - p100) * 0.33);
    const p75 = Math.round(p25 - (p25 - p100) * 0.67);
    return {
      lessonId: lesson.id,
      lessonName: lesson.name,
      estimated: true,
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
    lastMonthEnrolled,
    lastMonthCompleted,
    lastMonthCompletionRate,
    averageRating,
    lastMonthAverageRating,
    lessonCompletion,
    scrollDepth,
  };
}
