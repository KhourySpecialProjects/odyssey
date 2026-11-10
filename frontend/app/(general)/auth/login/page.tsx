import { GradientBackground } from "@/components/gradient-bg";
import { safeCallbackPath } from "@/lib/auth/callback-url";
import { getLoginProviders } from "@/lib/auth/login-providers";
import { Metadata } from "next";
import LoginButtons from "./buttons";

export const metadata: Metadata = {
  title: "Log In",
};

type Props = {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
};

// Signed-in users are redirected by middleware.ts: to a safe callbackUrl,
// otherwise to /explore.
export default async function SignIn({ searchParams }: Props) {
  const providers = getLoginProviders();
  // next-auth adds ?callbackUrl= when it sends a visitor here; only a
  // same-origin destination is passed on (open-redirect guard, ODY-628).
  const callbackUrl = safeCallbackPath((await searchParams).callbackUrl);

  return (
    <GradientBackground>
      <>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            Log In
          </h2>
          <p className="mt-4 text-lg leading-normal text-balance text-slate-600 dark:text-slate-300">
            Authenticate with GitHub or with your Northeastern account to access
            Khoury Odyssey.
          </p>
        </div>

        <div className="mx-auto mt-8 max-w-2xl text-center sm:mt-12">
          <LoginButtons providers={providers} callbackUrl={callbackUrl} />
        </div>
      </>
    </GradientBackground>
  );
}
