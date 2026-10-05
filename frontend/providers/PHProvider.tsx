"use client";

import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { useSession } from "next-auth/react";
import posthog from "posthog-js";
import { PostHogProvider, usePostHog } from "posthog-js/react";
import { useEffect } from "react";

function PostHogIdentify() {
  const ph = usePostHog();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (!ph) return;

    let cancelled = false;

    if (status === "authenticated" && session?.user?.email) {
      (async () => {
        try {
          // The session carries the authorized-user id; only tokens issued
          // before it was added need the lookup (a Server Action round trip)
          const authUserId =
            session.user.id ??
            (await getAuthorizedUserByEmail(session.user.email!))?.id;
          if (cancelled) return;

          if (authUserId) {
            ph.identify(authUserId.toString(), {
              name: session.user.name,
              email: session.user.email,
              username: (session.user as any).username,
            });
          }
        } catch {
          // ignore
        }
      })();
    } else if (status === "unauthenticated") {
      ph.reset();
    }

    return () => {
      cancelled = true;
    };
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
