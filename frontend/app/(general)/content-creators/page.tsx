import { ContentCreatorBlock } from "@/components/footer/content-creator-block";
import { GradientBackground } from "@/components/gradient-bg";
import { getCurrentUser } from "@/lib/auth/session";
import { fetchContentCreators } from "@/lib/requests/authorized-user";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Content Creators",
};

export default async function ContentCreatorsPage() {
  return (
    <GradientBackground>
      <>
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl pb-8">
            Content Creators
          </h1>
        </div>
        <div>
          <ul className=" divide-slate-200 dark:divide-slate-700 md:space-y-0">
            {(await fetchContentCreators()).map((creator) => (
              <ContentCreatorBlock contentCreator={creator} key={creator.id} />
            ))}
          </ul>
        </div>
      </>
    </GradientBackground>
  );
}
