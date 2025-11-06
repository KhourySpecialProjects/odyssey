import { DropletTile } from "@/components/droplets/droplet-tile";
import { EnrollButton } from "@/components/droplets/enroll-button";
import { GradientBackground } from "@/components/gradient-bg";
import { Badge } from "@/components/ui/badge";
import { getDropletBySlug } from "@/lib/requests/droplet";
import { uppercaseFirstChar } from "@/lib/utils";
import { Droplet } from "@/types";
import {
  BookTextIcon,
  FilePieChartIcon,
  GoalIcon,
  HammerIcon,
} from "lucide-react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { getEnrollmentsByAuthorizedUser } from "@/lib/requests/enrollment";
import { StarRating } from "@/components/ui/rating-stars";
import { AuthorCard } from "@/components/droplets/author-block";

type Props = {
  params: Promise<params>;
};

type params = {
  slug: string;
};

const stripHtmlTags = (html: string) => {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await params;
  const droplet = await getDropletBySlug<Pick<Droplet, "name">>(p.slug, {
    fields: ["name"],
    populate: undefined,
  });
  if (!droplet) return {};

  return {
    title: `Overview | ${droplet.name}`,
  };
}

export default async function DropletRoute({ params }: Props) {
  const p = await params;
  const droplet = await getDropletBySlug<Droplet>(p.slug, {
    fields: ["*"],
    populate: {
      learningObjectives: { populate: "*" },
      lessons: { populate: "*" },
      tags: { populate: "*" },
      authorized_users: { populate: "*", fields: ["*"] },
      prerequisites: { populate: ["id", "name", "slug"] },
      postrequisites: { populate: ["id", "name", "slug"] },
    },
  });
  if (!droplet) return notFound();

  let isEnrolled = false;
  const user = await getCurrentUser();

  if (user?.email) {
    const authorizedUser = await getAuthorizedUserByEmail(user.email);

    const enrollments = await getEnrollmentsByAuthorizedUser(authorizedUser.id);
    isEnrolled = enrollments.some((e) => e.droplet.id === droplet.id);
  }

  return (
    <>
      <GradientBackground className="px-0">
        <div className="mx-auto max-w-2xl px-5 md:px-0">
          <div className="flex flex-0 flex-row flex-wrap gap-1.5">
            <Badge variant="outline" className="text-sm">
              {uppercaseFirstChar(droplet.focusArea)}
            </Badge>
            <Badge variant="outline" className="text-sm">
              {uppercaseFirstChar(droplet.type)}
            </Badge>
            {droplet.tags?.map((tag) => (
              <Badge key={tag.id} variant="outline" className="text-sm">
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
          <h1 className="mt-3 text-6xl font-black text-slate-900 dark:text-white">
            {droplet.name}
          </h1>
          {droplet.description ? (
            <p className="mt-3 text-pretty text-slate-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-slate-300">
              {stripHtmlTags(droplet.description)}
            </p>
          ) : null}
        </div>

        <div className="mx-auto w-full max-w-2xl space-y-8 px-5 py-4 md:space-y-12 md:px-0 lg:py-8">
          {droplet.overview ? (
            <section>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                Overview
              </h2>

              <div className="mt-4 w-full rounded-md border border-slate-200 bg-slate-50 p-8 dark:border-slate-500 dark:bg-slate-800">
                <div
                  className="prose prose-sky prose-code:text-inherit prose-strong:text-inherit prose-headings:text-inherit mx-auto dark:text-slate-300"
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
              <p className="text-slate-500 dark:text-slate-300">
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
            <p className="text-slate-500 dark:text-slate-300">
              By completing this Droplet, you should:
            </p>

            <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 dark:border-slate-500 dark:bg-slate-800">
              <ul className="flex flex-col divide-y divide-slate-200 dark:divide-slate-500">
                {droplet.learningObjectives.map((objective) => (
                  <li
                    key={`objective-${objective.id}`}
                    className="inline-flex items-center gap-2 px-4 py-3 leading-snug dark:text-slate-300"
                  >
                    <GoalIcon className="mr-0.5 h-5 w-5 shrink-0" />
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
            <p className="text-slate-500 dark:text-slate-300">
              This Droplet contains the following lessons:
            </p>

            {droplet.lessons && droplet.lessons.length > 0 ? (
              <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 dark:border-slate-500 dark:bg-slate-800">
                <ul className="flex flex-col divide-y divide-slate-200 dark:divide-slate-500">
                  {droplet.lessons
                    .sort((a, b) => a.orderIndex - b.orderIndex)
                    .map((lesson) => {
                      return (
                        <li
                          key={`lesson-${lesson.id}`}
                          className="inline-flex items-center gap-2 px-4 py-3 leading-snug dark:text-slate-300"
                        >
                          {lesson.type === "activity" ? (
                            <HammerIcon className="mr-0.5 h-5 w-5 shrink-0" />
                          ) : lesson.type === "caseStudy" ? (
                            <FilePieChartIcon className="mr-0.5 h-5 w-5 shrink-0" />
                          ) : (
                            <BookTextIcon className="mr-0.5 h-5 w-5 shrink-0" />
                          )}
                          {lesson.name}
                        </li>
                      );
                    })}
                </ul>
              </div>
            ) : (
              <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-4 dark:border-slate-500 dark:bg-slate-800 dark:text-slate-300">
                This Droplet does not have any lessons yet. Check back soon!
              </div>
            )}
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              About the Authors
            </h2>
            <p className="text-slate-500 dark:text-slate-300">
              This Droplet was written by the following individuals:
            </p>

            <ul className="mt-4 flex flex-col divide-y divide-slate-200 rounded-md border border-slate-200 bg-slate-50 dark:divide-slate-500 dark:border-slate-500 dark:bg-slate-800">
              {droplet.authorized_users?.map((author) => (
                <AuthorCard key={author.id} author={author} />
              ))}
            </ul>
          </section>

          {droplet.lessons && droplet.lessons.length > 0 ? (
            <section>
              <EnrollButton droplet={droplet} isEnrolled={isEnrolled} />
            </section>
          ) : null}
        </div>
      </GradientBackground>
    </>
  );
}
