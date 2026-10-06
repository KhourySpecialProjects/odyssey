import { GradientBackground } from "@/components/gradient-bg";
import { isDemoMode } from "@/lib/auth/demo-login";
import { getLoginProviders } from "@/lib/auth/login-providers";
import { Metadata } from "next";
import LoginButtons from "./buttons";
import { DemoLogin } from "./demo-login";

export const metadata: Metadata = {
  title: "Log In",
};

// Signed-in users are redirected to /explore by middleware.ts.
export default function SignIn() {
  const providers = getLoginProviders();
  const demo = isDemoMode();

  return (
    <GradientBackground>
      <>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            Log In
          </h2>
          <p className="mt-4 text-lg leading-normal text-balance text-slate-600 dark:text-slate-300">
            {demo
              ? "This is the Odyssey demo. Pick a persona to explore as them. Everyone here is made up."
              : "Authenticate with GitHub or with your Northeastern account to access Khoury Odyssey."}
          </p>
        </div>

        <div
          className={`mx-auto mt-8 text-center sm:mt-12 ${demo ? "max-w-3xl" : "max-w-2xl"}`}
        >
          {demo ? <DemoLogin /> : <LoginButtons providers={providers} />}
        </div>
      </>
    </GradientBackground>
  );
}
