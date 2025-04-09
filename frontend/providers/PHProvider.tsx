"use client";

import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import { useEffect } from "react";

export function PHProvider({ children }: { children: React.ReactNode }) {
  // // disable analytics in non-prod environments
  // if (process.env.NODE_ENV !== "production") {
  //   return children;
  // }

  useEffect(() => {
    // Initialize PostHog only on the client side
    console.log("process", process.env.NEXT_PUBLIC_POSTHOG_KEY?.substring(0, 3))
    console.log("process", process.env.NEXT_PUBLIC_POSTHOG_KEY?.substring(10, 13))
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY || "", {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    });
  }, []);

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}
