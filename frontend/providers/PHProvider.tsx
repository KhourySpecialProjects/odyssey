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
          const authUser = await getAuthorizedUserByEmail(session.user.email!);
          if (cancelled) return;

          if (authUser?.id) {
            ph.identify(authUser.id.toString(), {
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
  }, [ph, status, session?.user?.email, session?.user?.name, (session?.user as any)?.username]);

  return null;
}

export function PHProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY || "", {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    });
  }, []);

  return (
    <PostHogProvider client={posthog}>
      <PostHogIdentify />
      {children}
    </PostHogProvider>
  );
}