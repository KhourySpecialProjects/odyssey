import { ContentCreatorBlock } from "@/components/footer/content-creator-block";
import { GradientBackground } from "@/components/gradient-bg";
import { fetchWebsiteCreators } from "@/lib/requests/authorized-user";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Website Creators",
};

export default async function WebsiteCreatorsPage() {
  return (
    <GradientBackground className="flex-grow">
      <div className="flex flex-col items-center">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="pb-8 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            Website Creators
          </h1>
        </div>
        <div className="w-[85%] md:w-[50%]">
          <ul className="divide-slate-200 md:space-y-0 dark:divide-slate-700">
            {(await fetchWebsiteCreators())?.map((creator) => (
              <ContentCreatorBlock contentCreator={creator} key={creator.id} />
            ))}
          </ul>
        </div>
      </div>
    </GradientBackground>
  );
}
