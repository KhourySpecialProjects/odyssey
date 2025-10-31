import * as authorizedUser from "./authorized-user";


interface UserActivity {
  timestamp: string;
  type: 'enrollment' | 'page_view' | 'lesson_view' | 'completion' | 'rating';
  description: string;
  details?: any;
}

/**
 * Fetches user activity from PostHog using the events API
 * NOTE: This must be called from server-side code only (Server Components, API Routes, Server Actions)
 */
async function getPostHogActivity(userId: number): Promise<UserActivity[]> {
  // Check if we're on the server
  if (typeof window !== 'undefined') {
    console.error("getPostHogActivity must be called from server-side code only");
    return [];
  }

  const projectId = "53063";
  const apiKey = process.env.POSTHOG_API_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com";
  
  if (!apiKey) {
    console.error("PostHog API key not configured. Make sure POSTHOG_API_KEY is set in your .env file");
    console.error("Available env vars:", Object.keys(process.env).filter(k => k.includes('POSTHOG')));
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
      return events.map((event: any) => {
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
function mapPostHogEventType(eventName: string): UserActivity['type'] {
  const lower = eventName.toLowerCase();
  
  if (lower.includes('lesson') && lower.includes('view')) {
    return 'lesson_view';
  }
  if (lower.includes('course') && lower.includes('complete')) {
    return 'completion';
  }
  if (lower.includes('enroll')) {
    return 'enrollment';
  }
  if (lower.includes('rating') || lower.includes('rate')) {
    return 'rating';
  }
  if (lower.includes('pageview') || lower === '$pageview') {
    return 'page_view';
  }
  
  return 'page_view';
}

/**
 * Formats PostHog event into human-readable description
 */
function formatPostHogDescription(event: any): string {
  const { event: eventName, properties } = event;
  
  // Handle standard pageview event
  if (eventName === '$pageview' || eventName === 'pageview') {
    const url = properties.$current_url || properties.url || properties.pathname;
    if (url) {
      const pathname = new URL(url, 'https://example.com').pathname;
      return `Viewed page: ${pathname}`;
    }
    return 'Viewed page';
  }
  
  // Handle lesson view events
  if (eventName.toLowerCase().includes('lesson')) {
    const lessonName = properties.lesson_name || properties.lessonName || properties.name;
    if (lessonName) {
      return `Viewed lesson: ${lessonName}`;
    }
    return 'Viewed lesson';
  }
  
  // Handle enrollment events
  if (eventName.toLowerCase().includes('enroll')) {
    const dropletName = properties.droplet_name || properties.dropletName || properties.course_name;
    if (dropletName) {
      return `Enrolled in: ${dropletName}`;
    }
    return 'Enrolled in course';
  }
  
  // Handle completion events
  if (eventName.toLowerCase().includes('complete')) {
    const dropletName = properties.droplet_name || properties.dropletName || properties.course_name;
    if (dropletName) {
      return `Completed: ${dropletName}`;
    }
    return 'Completed course';
  }
  
  // Handle rating events
  if (eventName.toLowerCase().includes('rating')) {
    const rating = properties.rating;
    const dropletName = properties.droplet_name || properties.dropletName;
    if (rating && dropletName) {
      return `Rated "${dropletName}" - ${rating}/5 stars`;
    }
    if (rating) {
      return `Gave rating: ${rating}/5 stars`;
    }
    return 'Left a rating';
  }
  
  // Default: use event name and any available title/name
  const title = properties.page_title || properties.title || properties.name;
  if (title) {
    return `${eventName}: ${title}`;
  }
  
  return eventName;
}

/**
 * Converts enrollments to activity format
 */
function enrollmentsToActivities(enrollments: any[]): UserActivity[] {
  const activities: UserActivity[] = [];

  enrollments.forEach((enrollment) => {
    // Enrollment creation
    if (enrollment.createdAt) {
      activities.push({
        timestamp: enrollment.createdAt,
        type: 'enrollment',
        description: `Enrolled in: ${enrollment.droplet?.name || 'Unknown Course'}`,
        details: {
          source: 'enrollment_data',
          dropletId: enrollment.droplet?.id,
          dropletName: enrollment.droplet?.name,
          isFirstTime: enrollment.isFirstTime,
        },
      });
    }

    // Course completion
    if (enrollment.isComplete && enrollment.completionDate) {
      activities.push({
        timestamp: enrollment.completionDate,
        type: 'completion',
        description: `Completed: ${enrollment.droplet?.name || 'Unknown Course'}`,
        details: {
          source: 'enrollment_data',
          dropletId: enrollment.droplet?.id,
          dropletName: enrollment.droplet?.name,
          rating: enrollment.rating,
        },
      });
    }

    // Rating given
    if (enrollment.rating && enrollment.updatedAt) {
      activities.push({
        timestamp: enrollment.updatedAt,
        type: 'rating',
        description: `Rated "${enrollment.droplet?.name}" - ${enrollment.rating}/5 stars`,
        details: {
          source: 'enrollment_data',
          dropletId: enrollment.droplet?.id,
          rating: enrollment.rating,
        },
      });
    }

    // Viewed lessons
    if (enrollment.viewedLessons && enrollment.viewedLessons.length > 0) {
      enrollment.viewedLessons.forEach((lesson: any) => {
        activities.push({
          timestamp: enrollment.updatedAt || new Date().toISOString(),
          type: 'lesson_view',
          description: `Viewed lesson: ${lesson.name} (in ${enrollment.droplet?.name})`,
          details: {
            source: 'enrollment_data',
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
  
  activities.forEach(activity => {
    // Create a key based on type, timestamp (rounded to minute), and key details
    const timestamp = new Date(activity.timestamp);
    const roundedTime = new Date(
      timestamp.getFullYear(),
      timestamp.getMonth(),
      timestamp.getDate(),
      timestamp.getHours(),
      timestamp.getMinutes()
    ).toISOString();
    
    const key = `${activity.type}-${roundedTime}-${JSON.stringify(activity.details?.dropletId || '')}`;
    
    // Prefer enrollment data over PostHog for enrollments, completions, and ratings
    if (!seen.has(key)) {
      seen.set(key, activity);
    } else {
      const existing = seen.get(key)!;
      if (activity.details?.source === 'enrollment_data' && 
          ['enrollment', 'completion', 'rating'].includes(activity.type)) {
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
    // Fetch from both sources in parallel
    const enrollmentsPromise = (authorizedUser as any).getEnrollmentsByAuthorizedUser
      ? (authorizedUser as any).getEnrollmentsByAuthorizedUser(userId)
      : (authorizedUser as any).default
        ? (authorizedUser as any).default(userId)
        : Promise.resolve([]);

    const [posthogActivities, enrollments] = await Promise.all([
      getPostHogActivity(userId),
      enrollmentsPromise,
    ]);

    // Convert enrollments to activities
    const enrollmentActivities = enrollmentsToActivities(enrollments);

    // Combine all activities
    const allActivities = [...posthogActivities, ...enrollmentActivities];

    // Remove duplicates (prefer enrollment data for enrollment-related events)
    const uniqueActivities = deduplicateActivities(allActivities);

    // Sort by timestamp (most recent first)
    uniqueActivities.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return uniqueActivities;
  } catch (error) {
    console.error("Error fetching user activity:", error);
    return [];
  }
}