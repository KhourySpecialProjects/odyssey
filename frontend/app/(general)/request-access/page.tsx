import { RequestAccessForm } from "@/components/requests/access-request-form";
import { GradientBackground } from "@/components/gradient-bg";
import { authOptions } from "@/lib/auth/options";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Request Access",
  description:
    "Interested in learning with Khoury Odyssey? Submit an access request today!",
};

export default async function RequestAccessPage() {
  const session = await getServerSession(authOptions);
  if (session) return redirect("/explore");

  return (
    <GradientBackground>
      <>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            Request Access
          </h2>
          <p className="mt-4 text-lg leading-normal text-slate-600 dark:text-slate-300">
            Currently, only a limited number of students have access to Khoury
            Odyssey. Please fill out the form below if you are interested in the
            Odyssey’s content.
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-2xl sm:mt-16">
          <RequestAccessForm />
        </div>
      </>
    </GradientBackground>
  );
}
