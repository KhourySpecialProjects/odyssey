"use client";

import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import { useEffect } from "react";

export function PHProvider({ children }: { children: React.ReactNode }) {

  useEffect(() => {
    // Initialize PostHog only on the client side
    posthog.init("phc_KbnlFRdLihV6ZjwM2X0A87eRPyw5yG1VbkqSWaKqj1x" || "", {
      api_host: "https://app.posthog.com",
    });
  }, []);

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;

}
