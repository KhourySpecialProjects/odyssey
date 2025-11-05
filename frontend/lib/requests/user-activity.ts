// lib/requests/user-activity.ts
import { getEnrollmentsByAuthorizedUser } from "@/lib/requests/enrollment";

interface UserActivity {
  timestamp: string;
  type: "enrollment" | "page_view" | "lesson_view" | "completion" | "rating";
  description: string;
  details?: any;
}

/**
 * Converts PostHog events to our activity format
 */
function convertPostHogEvents(events: any[]): UserActivity[] {
  console.log(`Converting ${events.length} PostHog events`);

  const filtered = events.filter((event: any) => {
    const eventName = event.event.toLowerCase();
    const shouldKeep =
      eventName !== "$identify" &&
      eventName !== "identify" &&
      eventName !== "$pageleave" &&
      eventName !== "pageleave" &&
      eventName !== "$set" &&
      eventName !== "set";

    if (!shouldKeep) {
      console.log(`Filtering out event: ${event.event}`);
    }
    return shouldKeep;
  });

  return filtered.map((event: any) => {
    const eventType = mapPostHogEventType(event.event);
    const description = formatPostHogDescription(event);

    if (!event.event.startsWith("$")) {
      console.log(`Custom event found: ${event.event}`, {
        type: eventType,
        description: description,
        properties: event.properties,
      });
    }

    return {
      timestamp: event.timestamp,
      type: eventType,
      description: description,
      details: {
        event_name: event.event,
        properties: event.properties,
      },
    };
  });
}

async function getPostHogActivity(userId: number): Promise<UserActivity[]> {
  if (typeof window !== "undefined") {
    console.error(
      "getPostHogActivity must be called from server-side code only",
    );
    return [];
  }

  const projectId = "53063";
  const apiKey = process.env.POSTHOG_API_KEY;
  const host =
    process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com";

  if (!apiKey) {
    console.error("PostHog API key not configured");
    return [];
  }

  try {
    const url = `${host}/api/projects/${projectId}/events/?distinct_id=${userId}&limit=1000`;

    const headers = {
      Authorization: `Bearer ${apiKey.trim()}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    const response = await fetch(url, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error("Failed to fetch PostHog events:", {
        status: response.status,
        statusText: response.statusText,
      });
      return [];
    }

    const data = JSON.parse(responseText);
    const events = data.results || [];
    return convertPostHogEvents(events);
  } catch (error: any) {
    console.error("PostHog Fetch Error:", error);
    return [];
  }
}

function mapPostHogEventType(eventName: string): UserActivity["type"] {
  const lower = eventName.toLowerCase();

  if (lower === "$autocapture" || lower === "autocapture") {
    return "page_view";
  }

  if (lower.includes("enroll") && !lower.includes("unenroll")) {
    return "enrollment";
  }

  if (lower.includes("unenroll")) {
    return "page_view";
  }

  if (lower.includes("continue")) {
    return "page_view";
  }

  // ADD THESE NEW LINES
  if (
    lower.includes("mark_as_complete") ||
    lower.includes("lesson_completed")
  ) {
    return "completion";
  }

  if (lower.includes("lesson") && lower.includes("view")) {
    return "lesson_view";
  }
  if (lower.includes("course") && lower.includes("complete")) {
    return "completion";
  }
  if (lower.includes("rating") || lower.includes("rate")) {
    return "rating";
  }
  if (lower.includes("pageview") || lower === "$pageview") {
    return "page_view";
  }

  return "page_view";
}

function formatPostHogDescription(event: any): string {
  const { event: eventName, properties } = event;

  if (
    eventName === "$autocapture" ||
    eventName === "$pageview" ||
    eventName === "pageview" ||
    eventName === "autocapture"
  ) {
    let pathname = properties.$pathname || properties.pathname || null;

    if (!pathname && properties.$current_url) {
      try {
        pathname = new URL(properties.$current_url).pathname;
      } catch (e) {
        pathname = properties.$current_url;
      }
    }

    if (pathname) {
      const cleanPath = pathname.replace(/\/$/, "");

      if (cleanPath === "/" || cleanPath === "") {
        return "Viewed: Home";
      }

      if (cleanPath.startsWith("/d/")) {
        const segments = cleanPath.split("/").filter(Boolean);

        if (segments.length === 2) {
          const courseName = segments[1].replace(/-/g, " ");
          const capitalizedCourseName = courseName
            .split(" ")
            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
          return `Viewed course: ${capitalizedCourseName}`;
        } else if (segments.length >= 3) {
          const courseName = segments[1].replace(/-/g, " ");
          const lessonName = segments[2].replace(/-/g, " ");

          const capitalizedLesson = lessonName
            .split(" ")
            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
          const capitalizedCourse = courseName
            .split(" ")
            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");

          return `Viewed: ${capitalizedLesson} (${capitalizedCourse})`;
        }
      }

      if (cleanPath.startsWith("/admin")) {
        return `Viewed: Admin Panel`;
      }

      if (cleanPath.startsWith("/profile")) {
        return `Viewed: Profile`;
      }

      if (cleanPath.startsWith("/dashboard")) {
        return `Viewed: Dashboard`;
      }

      const segments = cleanPath.split("/").filter(Boolean);
      if (segments.length > 0) {
        const lastSegment = segments[segments.length - 1].replace(/-/g, " ");
        return `Viewed: ${lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1)}`;
      }
    }

    return "Viewed page";
  }

  if (eventName.toLowerCase().includes("lesson_completed")) {
    const lessonName = properties.lesson_name || properties.lessonName;
    const dropletId = properties.droplet_id;
    if (lessonName) {
      return `Completed lesson: ${lessonName}`;
    }
    return "Completed lesson";
  }

  if (eventName.toLowerCase().includes("mark_as_complete")) {
    const lessonName = properties.lesson_name || properties.lessonName;
    if (lessonName) {
      return `Marked complete: ${lessonName}`;
    }
    return "Marked lesson complete";
  }

  if (eventName.toLowerCase().includes("lesson")) {
    const lessonName =
      properties.lesson_name || properties.lessonName || properties.name;
    if (lessonName) {
      return `Viewed lesson: ${lessonName}`;
    }
    return "Viewed lesson";
  }

  if (
    eventName.toLowerCase().includes("enroll") &&
    !eventName.toLowerCase().includes("unenroll")
  ) {
    const dropletName =
      properties.droplet_name ||
      properties.dropletName ||
      properties.course_name;
    if (dropletName) {
      return `Enrolled in: ${dropletName}`;
    }
    return "Enrolled in course";
  }

  if (eventName.toLowerCase().includes("unenroll")) {
    const dropletName =
      properties.droplet_name ||
      properties.dropletName ||
      properties.course_name;
    if (dropletName) {
      return `Unenrolled from: ${dropletName}`;
    }
    return "Unenrolled from course";
  }

  if (eventName.toLowerCase().includes("continue")) {
    const dropletName =
      properties.droplet_name ||
      properties.dropletName ||
      properties.course_name;
    if (dropletName) {
      return `Continued: ${dropletName}`;
    }
    return "Continued course";
  }

  if (eventName.toLowerCase().includes("complete")) {
    const dropletName =
      properties.droplet_name ||
      properties.dropletName ||
      properties.course_name;
    if (dropletName) {
      return `Droplet Completed: ${dropletName}`;
    }
    return "Completed course";
  }

  if (eventName.toLowerCase().includes("rating")) {
    const rating = properties.rating;
    const dropletName = properties.droplet_name || properties.dropletName;
    if (rating && dropletName) {
      return `Rated "${dropletName}" - ${rating}/5 stars`;
    }
    if (rating) {
      return `Gave rating: ${rating}/5 stars`;
    }
    return "Left a rating";
  }

  return eventName.replace(/_/g, " ").replace(/\$/g, "");
}

function enrollmentsToActivities(enrollments: any[]): UserActivity[] {
  const activities: UserActivity[] = [];

  enrollments.forEach((enrollment) => {
    if (enrollment.createdAt) {
      activities.push({
        timestamp: enrollment.createdAt,
        type: "enrollment",
        description: `Enrolled in: ${enrollment.droplet?.name || "Unknown Course"}`,
        details: {
          source: "enrollment_data",
          dropletId: enrollment.droplet?.id,
          dropletName: enrollment.droplet?.name,
          isFirstTime: enrollment.isFirstTime,
        },
      });
    }

    if (enrollment.isComplete) {
      const completionTimestamp =
        enrollment.completionDate ||
        enrollment.updatedAt ||
        new Date().toISOString();
      activities.push({
        timestamp: completionTimestamp,
        type: "completion",
        description: `Completed droplet: ${enrollment.droplet?.name || "Unknown Course"}`,
        details: {
          source: "enrollment_data",
          dropletId: enrollment.droplet?.id,
          dropletName: enrollment.droplet?.name,
          rating: enrollment.rating,
          completionDate: enrollment.completionDate,
        },
      });
    }

    if (enrollment.rating && enrollment.updatedAt && !enrollment.isComplete) {
      activities.push({
        timestamp: enrollment.updatedAt,
        type: "rating",
        description: `Rated "${enrollment.droplet?.name}" - ${enrollment.rating}/5 stars`,
        details: {
          source: "enrollment_data",
          dropletId: enrollment.droplet?.id,
          rating: enrollment.rating,
        },
      });
    }

    if (enrollment.viewedLessons && enrollment.viewedLessons.length > 0) {
      enrollment.viewedLessons.forEach((lesson: any) => {
        activities.push({
          timestamp: enrollment.updatedAt || new Date().toISOString(),
          type: "lesson_view",
          description: `Viewed: ${lesson.name} (${enrollment.droplet?.name})`,
          details: {
            source: "enrollment_data",
            lessonId: lesson.id,
            lessonName: lesson.name,
            lessonSlug: lesson.slug,
            dropletId: enrollment.droplet?.id,
          },
        });
      });
    }
  });

  return activities;
}

function deduplicateActivities(activities: UserActivity[]): UserActivity[] {
  const seen = new Map<string, UserActivity>();

  activities.forEach((activity) => {
    const timestamp = new Date(activity.timestamp);
    const roundedTime = new Date(
      timestamp.getFullYear(),
      timestamp.getMonth(),
      timestamp.getDate(),
      timestamp.getHours(),
      timestamp.getMinutes(),
    ).toISOString();

    const key = `${activity.type}-${roundedTime}-${JSON.stringify(activity.details?.dropletId || "")}`;

    if (!seen.has(key)) {
      seen.set(key, activity);
    } else {
      const existing = seen.get(key)!;
      if (
        activity.details?.source === "enrollment_data" &&
        ["enrollment", "completion", "rating"].includes(activity.type)
      ) {
        seen.set(key, activity);
      }
    }
  });

  return Array.from(seen.values());
}

export async function getUserActivity(userId: number): Promise<UserActivity[]> {
  try {
    const posthogActivities = await getPostHogActivity(userId);
    console.log(
      `Fetched ${posthogActivities.length} PostHog activities for user ${userId}`,
    );

    let enrollments: any[] = [];
    try {
      if (getEnrollmentsByAuthorizedUser) {
        enrollments = await getEnrollmentsByAuthorizedUser(userId, {
          fields: [
            "id",
            "rating",
            "isComplete",
            "isFirstTime",
            "isArchived",
            "completionDate",
            "createdAt",
            "updatedAt",
          ],
          populate: {
            droplet: {
              populate: {
                lessons: {
                  fields: ["id", "name", "slug"],
                },
              },
              fields: ["id", "name", "slug"],
            },
            viewedLessons: {
              fields: ["id", "name", "slug"],
            },
          },
        });
        console.log(
          `Fetched ${enrollments.length} enrollments for user ${userId}`,
        );
      }
    } catch (error) {
      console.log("Enrollment data not available:", error);
    }

    const enrollmentActivities = enrollmentsToActivities(enrollments);
    console.log(
      `Converted to ${enrollmentActivities.length} enrollment activities`,
    );

    const allActivities = [...posthogActivities, ...enrollmentActivities];
    const uniqueActivities = deduplicateActivities(allActivities);

    uniqueActivities.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    console.log(`Returning ${uniqueActivities.length} total activities`);
    return uniqueActivities;
  } catch (error) {
    console.error("Error fetching user activity:", error);
    return [];
  }
}
