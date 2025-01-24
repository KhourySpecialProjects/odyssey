import { GradientBackground } from "@/components/gradient-bg";
import { getCurrentUser } from "@/lib/auth/session";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Content Creators",
};

export default async function ContentCreatorsPage() {
  const user = await getCurrentUser();
  return (
    <GradientBackground>
      <>
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Content Creators
          </h1>
        </div>
      </>
    </GradientBackground>
  );
}
