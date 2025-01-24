import { GradientBackground } from "@/components/gradient-bg";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Website Creators",
};

export default async function WebsiteCreatorsPage() {
  return (
    <GradientBackground>
      <>
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Website Creators
          </h1>
        </div>
      </>
    </GradientBackground>
  );
}
