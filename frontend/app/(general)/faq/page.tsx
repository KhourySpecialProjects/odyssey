import { GradientBackground } from "@/components/gradient-bg";
import { Metadata } from "next";
import { FAQList } from "./faq-list";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
};

export default async function FAQPage() {
  return (
    <GradientBackground>
      <div className="flex flex-col items-center h-full">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl pb-8">
            Frequently Asked Questions
          </h1>
        </div>
        <FAQList />
      </div>
    </GradientBackground>
  );
}
