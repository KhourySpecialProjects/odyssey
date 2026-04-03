import { DropletTile } from "@/components/droplets/droplet-tile";
import { EnrollButton } from "@/components/droplets/enroll-button";
import { Badge } from "@/components/ui/badge";
import {
  stripHtmlTags,
  uppercaseFirstChar,
  getDifficultyBadgeColor,
  cn,
} from "@/lib/utils";
import { getTagColors } from "@/lib/tag-colors";
import { IconTarget, IconBook2 } from "@tabler/icons-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getCachedUser,
  getCachedEnrollmentsWithLessonIds,
  getCachedDropletBySlug,
} from "@/lib/requests/cached";
import { StarRating } from "@/components/ui/rating-stars";
import { AuthorCard } from "@/components/droplets/author-block";

type Props = {
  params: Promise<params>;
};

type params = {
  slug: string;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await params;
  const droplet = await getCachedDropletBySlug(p.slug);
  if (!droplet) return {};

  return {
    title: `Overview | ${droplet.name}`,
  };
}

export default async function DropletRoute({ params }: Props) {
  const p = await params;
  const [droplet, user] = await Promise.all([
    getCachedDropletBySlug(p.slug),
    getCurrentUser(),
  ]);
  if (!droplet) return notFound();

  let isEnrolled = false;

  if (user?.email) {
    const authorizedUser = await getCachedUser(user.email);

    const enrollments = await getCachedEnrollmentsWithLessonIds(
      authorizedUser.id,
    );
    isEnrolled = enrollments.some(
      (e) => e.droplet && e.droplet.id === droplet.id,
    );
  }

  return (
    <>
      <div className="min-h-screen bg-white pt-6 dark:bg-zinc-950">
        <div className="px-40">
          <div className="flex flex-0 flex-row flex-wrap gap-1.5">
            <Badge
              variant="outline"
              className={cn(
                "rounded-[16px] border-0 px-[9px] py-[4px] text-[14px] leading-[18px] font-medium",
                getTagColors(droplet.focusArea).bg,
                getTagColors(droplet.focusArea).text,
              )}
            >
              {uppercaseFirstChar(droplet.focusArea)}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                "rounded-[16px] border-0 px-[9px] py-[4px] text-[14px] leading-[18px] font-medium",
                getTagColors(droplet.type).bg,
                getTagColors(droplet.type).text,
              )}
            >
              {uppercaseFirstChar(droplet.type)}
            </Badge>
            {droplet.difficulty && (
              <Badge
                variant="outline"
                className={cn(
                  "rounded-[16px] border-0 px-[9px] py-[4px] text-[14px] leading-[18px] font-medium",
                  getDifficultyBadgeColor(droplet.difficulty),
                )}
              >
                {uppercaseFirstChar(droplet.difficulty)}
              </Badge>
            )}
            {droplet.tags?.map((tag) => (
              <Badge
                key={tag.id}
                variant="outline"
                className={cn(
                  "rounded-[16px] border-0 px-[9px] py-[4px] text-[14px] leading-[18px] font-medium",
                  getTagColors(tag.name).bg,
                  getTagColors(tag.name).text,
                )}
              >
                {tag.name}
              </Badge>
            ))}

            {droplet.averageRating && droplet.averageRating != 0.0 ? (
              <StarRating
                value={droplet.averageRating}
                enrollmentID={""}
                average={true}
              ></StarRating>
            ) : null}
          </div>
          <h1 className="mt-6 text-[2.5rem] font-bold text-slate-900 dark:text-white">
            {droplet.name}
          </h1>
          {droplet.description ? (
            <p className="mt-3 text-pretty text-slate-600 md:text-lg/relaxed lg:text-sm/relaxed xl:text-lg/relaxed dark:text-slate-300">
              {stripHtmlTags(droplet.description)}
            </p>
          ) : null}
        </div>

        <div className="w-full space-y-10 px-40 pt-10 pb-10">
          {droplet.overview ? (
            <section>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                Overview
              </h2>

              <div className="mt-4 w-full rounded-lg border border-[#D0D5DD] bg-[#fcfcfd] p-8 dark:border-slate-500 dark:bg-slate-800">
                <div
                  className="prose prose-sky prose-code:text-inherit prose-strong:text-inherit prose-headings:text-inherit dark:text-slate-300"
                  dangerouslySetInnerHTML={{ __html: droplet.overview }}
                ></div>
              </div>
            </section>
          ) : null}

          {droplet.prerequisites && droplet.prerequisites.length > 0 ? (
            <section>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                Recommended Background
              </h2>
              <p className="mt-1 text-slate-600 dark:text-slate-300">
                Before beginning, we recommend completing the following
                Droplets:
              </p>

              <ul className="mt-4 grid grid-flow-row grid-cols-1 gap-4 sm:grid-cols-2">
                {droplet.prerequisites.map((droplet) => (
                  <DropletTile key={droplet.id} droplet={droplet} />
                ))}
              </ul>
            </section>
          ) : null}

          <section>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Learning Objectives
            </h2>
            <p className="mt-1 text-slate-600 dark:text-slate-300">
              By completing this Droplet, you should:
            </p>

            <div className="mt-4 rounded-lg border border-[#D0D5DD] bg-[#fcfcfd] dark:border-slate-500 dark:bg-slate-800">
              <ul className="flex flex-col divide-y divide-slate-200 dark:divide-slate-500">
                {droplet.learningObjectives.map((objective) => (
                  <li
                    key={`objective-${objective.id}`}
                    className="inline-flex items-center gap-2 px-4 py-3 leading-snug dark:text-slate-300"
                  >
                    <IconTarget
                      className="mr-0.5 h-5 w-5 shrink-0"
                      stroke={1.5}
                    />
                    {objective.objective}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              What&rsquo;s Inside
            </h2>
            <p className="mt-1 text-slate-600 dark:text-slate-300">
              This Droplet contains the following lessons:
            </p>

            {droplet.lessons && droplet.lessons.length > 0 ? (
              <div className="mt-4 rounded-lg border border-[#D0D5DD] bg-[#fcfcfd] dark:border-slate-500 dark:bg-slate-800">
                <ul className="flex flex-col divide-y divide-slate-200 dark:divide-slate-500">
                  {droplet.lessons
                    .sort((a, b) => a.orderIndex - b.orderIndex)
                    .map((lesson) => {
                      return (
                        <li
                          key={`lesson-${lesson.id}`}
                          className="inline-flex items-center gap-2 px-4 py-3 leading-snug dark:text-slate-300"
                        >
                          <IconBook2
                            className="mr-0.5 h-5 w-5 shrink-0"
                            stroke={1.5}
                          />
                          {lesson.name}
                        </li>
                      );
                    })}
                </ul>
              </div>
            ) : (
              <div className="mt-2 rounded-lg border border-[#D0D5DD] bg-[#fcfcfd] p-4 dark:border-slate-500 dark:bg-slate-800 dark:text-slate-300">
                This Droplet does not have any lessons yet. Check back soon!
              </div>
            )}
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              About the Authors
            </h2>
            <p className="mt-1 text-slate-600 dark:text-slate-300">
              This Droplet was written by the following individuals:
            </p>

            <ul className="mt-4 flex flex-col divide-y divide-slate-200 rounded-lg border border-[#D0D5DD] bg-[#fcfcfd] dark:divide-slate-500 dark:border-slate-500 dark:bg-slate-800">
              {droplet.authorized_users?.map((author) => (
                <li key={author.id}>
                  <AuthorCard author={author} />
                </li>
              ))}
            </ul>
          </section>

          {droplet.lessons && droplet.lessons.length > 0 ? (
            <section>
              <EnrollButton droplet={droplet} isEnrolled={isEnrolled} />
            </section>
          ) : null}
        </div>
      </div>
    </>
  );
}
