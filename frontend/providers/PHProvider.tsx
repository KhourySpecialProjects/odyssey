"use client";

import { useSession } from "next-auth/react";
import posthog from "posthog-js";
import { PostHogProvider, usePostHog } from "posthog-js/react";
import { useEffect } from "react";

function PostHogIdentify() {
  const ph = usePostHog();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (!ph) return;

    // The session carries the authorized-user id (ODY-555), so no lookup is
    // needed. A stale token without an id is refreshed by the session re-check
    // and this effect re-runs once the id appears.
    if (status === "authenticated" && session?.user?.id) {
      ph.identify(session.user.id.toString(), {
        name: session.user.name,
        email: session.user.email,
        username: (session.user as any).username,
      });
    } else if (status === "unauthenticated") {
      ph.reset();
    }
  }, [
    ph,
    status,
    session?.user?.id,
    session?.user?.email,
    session?.user?.name,
    (session?.user as any)?.username,
  ]);

  return null;
}

const isLocal = process.env.NEXT_PUBLIC_APP_ENV === "local";

export function PHProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (isLocal) return;

    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY || "", {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    });
  }, []);

  if (isLocal) {
    return <>{children}</>;
  }

  return (
    <PostHogProvider client={posthog}>
      <PostHogIdentify />
      {children}
    </PostHogProvider>
  );
}
