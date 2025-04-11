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
    const phKey = "phc_KbnlFRdLihV6ZjwM2X0A87eRPyw5yG1VbkqSWaKqj1x";
    const phHost = "https://app.posthog.com";

    if (phKey) {
      posthog.init(phKey, {
        api_host: phHost || "https://app.posthog.com",
      });
    } 
  }, []);

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}
