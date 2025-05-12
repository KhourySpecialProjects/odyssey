import { GradientBackground } from "@/components/gradient-bg";
import { Metadata } from "next";
import { FAQList } from "./faq-list";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
};

export default async function FAQPage() {
  return (
    <GradientBackground>
      <div className="flex h-full flex-col items-center">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="pb-8 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            Frequently Asked Questions
          </h1>
        </div>
        <FAQList />
      </div>
    </GradientBackground>
  );
}
