"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";

declare global {
  interface Window {
    posthog?: typeof posthog;
  }
}

interface PostHogProviderProps {
  children: React.ReactNode;
  userId?: number;
  userEmail?: string;
  userName?: string;
}

export function PostHogProvider({
  children,
  userId,
  userEmail,
  userName,
}: PostHogProviderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Initialize PostHog (only once)
    if (typeof window !== "undefined" && !window.posthog) {
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
        api_host:
          process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com",
        capture_pageview: false, // We'll manually capture pageviews
        capture_pageleave: true,
        persistence: "localStorage",
        autocapture: true, // Automatically capture clicks and other interactions
      });

      // Make posthog available globally
      window.posthog = posthog;
    }

    // Identify user if logged in
    if (userId && typeof window !== "undefined") {
      posthog.identify(userId.toString(), {
        email: userEmail,
        name: userName,
        user_id: userId,
      });
    }
  }, [userId, userEmail, userName]);

  useEffect(() => {
    // Track pageviews on route changes
    if (pathname && typeof window !== "undefined") {
      let url = window.origin + pathname;
      if (searchParams && searchParams.toString()) {
        url = url + "?" + searchParams.toString();
      }

      posthog.capture("$pageview", {
        $current_url: url,
        pathname: pathname,
        user_id: userId,
      });
    }
  }, [pathname, searchParams, userId]);

  return <>{children}</>;
}

// Hook to track custom events easily
export function usePostHog() {
  const trackEvent = (
    eventName: string,
    properties?: Record<string, string | number | boolean | null | undefined>,
  ) => {
    if (typeof window !== "undefined" && window.posthog) {
      window.posthog.capture(eventName, properties);
    }
  };

  const trackEnrollment = (
    dropletId: number,
    dropletName: string,
    userId: number,
    isFirstTime: boolean = false,
  ) => {
    trackEvent("course_enrollment", {
      droplet_id: dropletId,
      droplet_name: dropletName,
      user_id: userId,
      is_first_time: isFirstTime,
      timestamp: new Date().toISOString(),
    });
  };

  const trackLessonView = (
    lessonId: number,
    lessonName: string,
    dropletId: number,
    userId: number,
  ) => {
    trackEvent("lesson_view", {
      lesson_id: lessonId,
      lesson_name: lessonName,
      droplet_id: dropletId,
      user_id: userId,
      timestamp: new Date().toISOString(),
    });
  };

  const trackCourseCompletion = (
    dropletId: number,
    dropletName: string,
    userId: number,
  ) => {
    trackEvent("course_completion", {
      droplet_id: dropletId,
      droplet_name: dropletName,
      user_id: userId,
      completion_date: new Date().toISOString(),
    });
  };

  const trackRating = (
    dropletId: number,
    dropletName: string,
    rating: number,
    userId: number,
  ) => {
    trackEvent("course_rating", {
      droplet_id: dropletId,
      droplet_name: dropletName,
      rating: rating,
      user_id: userId,
      timestamp: new Date().toISOString(),
    });
  };

  return {
    trackEvent,
    trackEnrollment,
    trackLessonView,
    trackCourseCompletion,
    trackRating,
  };
}
