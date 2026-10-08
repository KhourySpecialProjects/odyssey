import { Metadata } from "next";
import { notFound } from "next/navigation";
import { GradientBackground } from "@/components/gradient-bg";
import { isDemoMode } from "@/lib/auth/demo-login";
import { safeCallbackPath } from "@/lib/auth/demo-login-link";
import { DemoLinkSignIn } from "./demo-link-sign-in";

export const metadata: Metadata = {
  title: "Log In",
};

type Props = {
  searchParams: Promise<{ token?: string; callbackUrl?: string }>;
};

/** Where a demo login link lands: logs in with the link's token, then moves on. */
export default async function DemoLinkPage({ searchParams }: Props) {
  if (!isDemoMode()) notFound();
  const { token, callbackUrl } = await searchParams;

  return (
    <GradientBackground>
      <div className="mx-auto max-w-2xl text-center">
        <DemoLinkSignIn
          token={token ?? ""}
          callbackUrl={safeCallbackPath(callbackUrl)}
        />
      </div>
    </GradientBackground>
  );
}
