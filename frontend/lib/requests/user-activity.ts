// lib/requests/user-activity.ts
// import * as authorizedUser from "./authorized-user";
import { getEnrollmentsByAuthorizedUser } from "./enrollment";

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
  return events
    .filter((event: any) => {
      // Filter out non-useful events
      const eventName = event.event.toLowerCase();
      return (
        eventName !== "$identify" &&
        eventName !== "identify" &&
        eventName !== "$pageleave" &&
        eventName !== "pageleave" &&
        eventName !== "$set" &&
        eventName !== "set"
      );
    })
    .map((event: any, index: number) => {
      const eventType = mapPostHogEventType(event.event);

      return {
        timestamp: event.timestamp,
        type: eventType,
        description: formatPostHogDescription(event),
        details: {
          event_name: event.event,
          properties: event.properties,
        },
      };
    });
}

/**
 * Fetches user activity from PostHog using the events API
 * NOTE: This must be called from server-side code only (Server Components, API Routes, Server Actions)
 */
async function getPostHogActivity(userId: number): Promise<UserActivity[]> {
  // Check if we're on the server
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
    console.error(
      "PostHog API key not configured. Make sure POSTHOG_API_KEY is set in your .env file",
    );
    console.error(
      "Available env vars:",
      Object.keys(process.env).filter((k) => k.includes("POSTHOG")),
    );
    return [];
  }

  try {
    // Query PostHog Events API for this specific user
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
        response: responseText.substring(0, 200),
        url: url,
      });
      return [];
    }

    try {
      const data = JSON.parse(responseText);
      const events = data.results || [];

      // Convert PostHog events to our activity format
      return convertPostHogEvents(events);
    } catch (parseError) {
      console.error("Failed to parse PostHog response:", parseError);
      console.error("Response text:", responseText.substring(0, 500));
      return [];
    }
  } catch (error: any) {
    console.error("PostHog Fetch Error:", {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
    return [];
  }
}

/**
 * Maps PostHog event names to activity types
 */
function mapPostHogEventType(eventName: string): UserActivity["type"] {
  const lower = eventName.toLowerCase();

  // Treat autocapture as page views
  if (lower === "$autocapture" || lower === "autocapture") {
    return "page_view";
  }

  if (lower.includes("lesson") && lower.includes("view")) {
    return "lesson_view";
  }
  if (lower.includes("course") && lower.includes("complete")) {
    return "completion";
  }
  if (lower.includes("enroll")) {
    return "enrollment";
  }
  if (lower.includes("rating") || lower.includes("rate")) {
    return "rating";
  }
  if (lower.includes("pageview") || lower === "$pageview") {
    return "page_view";
  }

  return "page_view";
}

/**
 * Formats PostHog event into human-readable description
 */
function formatPostHogDescription(event: any): string {
  const { event: eventName, properties } = event;

  // Handle autocapture and pageview events
  if (
    eventName === "$autocapture" ||
    eventName === "$pageview" ||
    eventName === "pageview" ||
    eventName === "autocapture"
  ) {
    // Try to get the pathname - $pathname is the most reliable for autocapture
    let pathname = properties.$pathname || properties.pathname || null;

    // Fallback to extracting from URL if pathname not available
    if (!pathname && properties.$current_url) {
      try {
        pathname = new URL(properties.$current_url).pathname;
      } catch (e) {
        pathname = properties.$current_url;
      }
    } else if (!pathname && properties.current_url) {
      try {
        pathname = new URL(properties.current_url).pathname;
      } catch (e) {
        pathname = properties.current_url;
      }
    } else if (!pathname && properties.url) {
      try {
        pathname = new URL(properties.url).pathname;
      } catch (e) {
        pathname = properties.url;
      }
    }

    if (pathname) {
      // Clean up the pathname
      const cleanPath = pathname.replace(/\/$/, "");

      if (cleanPath === "/" || cleanPath === "") {
        return "Viewed: Home";
      }

      // Handle /d/ paths (lessons/courses) - YOUR PRIMARY USE CASE
      if (cleanPath.startsWith("/d/")) {
        const segments = cleanPath.split("/").filter(Boolean);
        // segments: ['d', 'course-name', 'lesson-name']

        if (segments.length === 2) {
          // Just the course: /d/course-name
          const courseName = segments[1].replace(/-/g, " ");
          const capitalizedCourseName = courseName
            .split(" ")
            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
          return `Viewed course: ${capitalizedCourseName}`;
        } else if (segments.length >= 3) {
          // Course and lesson: /d/course-name/lesson-name
          const courseName = segments[1].replace(/-/g, " ");
          const lessonName = segments[2].replace(/-/g, " ");

          // Capitalize first letter of each word
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

      // Format common patterns nicely
      if (cleanPath.startsWith("/droplets/")) {
        const dropletSlug = cleanPath.split("/").filter(Boolean).pop();
        const formatted = dropletSlug?.replace(/-/g, " ") || "course";
        return `Viewed course: ${formatted.charAt(0).toUpperCase() + formatted.slice(1)}`;
      }

      if (cleanPath.startsWith("/lessons/")) {
        const lessonSlug = cleanPath.split("/").filter(Boolean).pop();
        const formatted = lessonSlug?.replace(/-/g, " ") || "lesson";
        return `Viewed lesson: ${formatted.charAt(0).toUpperCase() + formatted.slice(1)}`;
      }

      if (cleanPath.startsWith("/admin")) {
        const adminPath = cleanPath.replace("/admin", "").replace(/^\//, "");
        if (adminPath) {
          const formatted = adminPath.replace(/-/g, " ");
          return `Viewed: Admin - ${formatted.charAt(0).toUpperCase() + formatted.slice(1)}`;
        }
        return `Viewed: Admin Panel`;
      }

      if (cleanPath.startsWith("/profile")) {
        return `Viewed: Profile`;
      }

      if (cleanPath.startsWith("/dashboard")) {
        return `Viewed: Dashboard`;
      }

      // For other pages, show the last meaningful segment
      const segments = cleanPath.split("/").filter(Boolean);
      if (segments.length > 0) {
        const lastSegment = segments[segments.length - 1].replace(/-/g, " ");
        return `Viewed: ${lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1)}`;
      }
    }

    // Fallback
    return "Viewed page";
  }

  // Handle lesson view events
  if (eventName.toLowerCase().includes("lesson")) {
    const lessonName =
      properties.lesson_name || properties.lessonName || properties.name;
    if (lessonName) {
      return `Viewed lesson: ${lessonName}`;
    }
    return "Viewed lesson";
  }

  // Handle enrollment events
  if (eventName.toLowerCase().includes("enroll")) {
    const dropletName =
      properties.droplet_name ||
      properties.dropletName ||
      properties.course_name;
    if (dropletName) {
      return `Enrolled in: ${dropletName}`;
    }
    return "Enrolled in course";
  }

  // Handle completion events
  if (eventName.toLowerCase().includes("complete")) {
    const dropletName =
      properties.droplet_name ||
      properties.dropletName ||
      properties.course_name;
    if (dropletName) {
      return `Completed: ${dropletName}`;
    }
    return "Completed course";
  }

  // Handle rating events
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

  // Default: use event name only (simplified)
  return eventName.replace(/_/g, " ").replace(/\$/g, "");
}

/**
 * Converts enrollments to activity format
 */
function enrollmentsToActivities(enrollments: any[]): UserActivity[] {
  const activities: UserActivity[] = [];

  enrollments.forEach((enrollment) => {
    // Enrollment creation - use createdAt if available
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

    // Course completion - ALWAYS show if marked complete
    if (enrollment.isComplete) {
      const completionTimestamp =
        enrollment.completionDate ||
        enrollment.updatedAt ||
        new Date().toISOString();
      activities.push({
        timestamp: completionTimestamp,
        type: "completion",
        description: `Completed: ${enrollment.droplet?.name || "Unknown Course"}`,
        details: {
          source: "enrollment_data",
          dropletId: enrollment.droplet?.id,
          dropletName: enrollment.droplet?.name,
          rating: enrollment.rating,
          completionDate: enrollment.completionDate,
        },
      });
    }

    // Rating given - use updatedAt if available (but don't duplicate if completion shown)
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

    // Viewed lessons - each viewed lesson becomes an activity
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

/**
 * Deduplicates activities that appear in both PostHog and enrollment data
 */
function deduplicateActivities(activities: UserActivity[]): UserActivity[] {
  const seen = new Map<string, UserActivity>();

  activities.forEach((activity) => {
    // Create a key based on type, timestamp (rounded to minute), and key details
    const timestamp = new Date(activity.timestamp);
    const roundedTime = new Date(
      timestamp.getFullYear(),
      timestamp.getMonth(),
      timestamp.getDate(),
      timestamp.getHours(),
      timestamp.getMinutes(),
    ).toISOString();

    const key = `${activity.type}-${roundedTime}-${JSON.stringify(activity.details?.dropletId || "")}`;

    // Prefer enrollment data over PostHog for enrollments, completions, and ratings
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

/**
 * Main function to get all user activity
 */
export async function getUserActivity(userId: number): Promise<UserActivity[]> {
  try {
    // Fetch PostHog activities
    const posthogActivities = await getPostHogActivity(userId);

    // Try to fetch enrollments with timestamps
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
      }
    } catch (error) {
      console.log("Enrollment data not available:", error);
      // Continue without enrollment data - just show PostHog activities
    }

    // Convert enrollments to activities
    const enrollmentActivities = enrollmentsToActivities(enrollments);

    // Combine all activities
    const allActivities = [...posthogActivities, ...enrollmentActivities];

    // Remove duplicates (prefer enrollment data for enrollment-related events)
    const uniqueActivities = deduplicateActivities(allActivities);

    // Sort by timestamp (most recent first)
    uniqueActivities.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    return uniqueActivities;
  } catch (error) {
    console.error("Error fetching user activity:", error);
    return [];
  }
}
