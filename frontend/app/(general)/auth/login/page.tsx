import { GradientBackground } from "@/components/gradient-bg";
import { authOptions } from "@/lib/auth/options";
import { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { getProviders } from "next-auth/react";
import { redirect } from "next/navigation";
import LoginButtons from "./buttons";

export const metadata: Metadata = {
  title: "Log In",
};

export default async function SignIn() {
  const session = await getServerSession(authOptions);

  // If the user is already logged in, redirect.
  // Note: Make sure not to redirect to the same page
  // To avoid an infinite loop!
  if (session) {
    return redirect("/explore");
  }

  const providers = await getProviders();

  return (
    <GradientBackground>
      <>
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Log In
          </h2>
          <p className="mt-4 text-lg leading-normal text-slate-600 dark:text-slate-300 text-balance">
            Authenticate with GitHub or with your Northeastern account to access
            Khoury Odyssey.
          </p>
        </div>

        <div className="max-w-2xl mx-auto mt-8 text-center sm:mt-12">
          <LoginButtons providers={providers} />
        </div>
      </>
    </GradientBackground>
  );
}
