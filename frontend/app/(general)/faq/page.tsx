import { ContentCreatorBlock } from "@/components/footer/content-creator-block";
import { GradientBackground } from "@/components/gradient-bg";
import { fetchWebsiteCreators } from "@/lib/requests/authorized-user";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
};

export default async function FAQPage() {
  return (
    <GradientBackground>
      <>
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl pb-8">
            Frequently Asked Questions
          </h1>
        </div>
        <div>
          <ul className=" divide-slate-200 dark:divide-slate-700 md:space-y-0">
            <div>
              <li className="py-4 px-6 [&:not(:first-child)]:pt-3 group relative border border-gray-300 rounded-md transition duration-150 group-hover:border-gray-500">
                <div className="flex items-center space-x-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-xl font-bold truncate text-slate-900 dark:text-white text-center">
                      When was Odyssey first created?
                    </p>
                  </div>
                </div>

                <div className="max-h-0 overflow-y-scroll transition-[max-height] duration-300 ease-in-out group-hover:max-h-96 text-center">
                  <div>(insert answer here)</div>
                </div>
              </li>
              <li className="py-4 px-6 [&:not(:first-child)]:pt-3 group relative border border-gray-300 rounded-md transition duration-150 group-hover:border-gray-500">
                <div className="flex items-center space-x-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-xl font-bold truncate text-slate-900 dark:text-white text-center">
                      What was the motivation behind this website?
                    </p>
                  </div>
                </div>

                <div className="max-h-0 overflow-y-scroll transition-[max-height] duration-300 ease-in-out group-hover:max-h-96 text-center">
                  <div>(insert answer here)</div>
                </div>
              </li>
              <li className="py-4 px-6 [&:not(:first-child)]:pt-3 group relative border border-gray-300 rounded-md transition duration-150 group-hover:border-gray-500">
                <div className="flex items-center space-x-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-xl font-bold truncate text-slate-900 dark:text-white text-center">
                      What are the plans for Odyssey in the future?
                    </p>
                  </div>
                </div>

                <div className="max-h-0 overflow-y-scroll transition-[max-height] duration-300 ease-in-out group-hover:max-h-96 text-center">
                  <div>(insert answer here)</div>
                </div>
              </li>
            </div>
          </ul>
        </div>
      </>
    </GradientBackground>
  );
}
