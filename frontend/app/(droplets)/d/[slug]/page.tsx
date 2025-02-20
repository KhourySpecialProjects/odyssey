import { DropletTile } from "@/components/droplets/droplet-tile";
import { EnrollButton } from "@/components/droplets/enroll-button";
import { GradientBackground } from "@/components/gradient-bg";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getDropletBySlug } from "@/lib/requests/droplet";
import { getInitials, uppercaseFirstChar } from "@/lib/utils";
import { Droplet } from "@/types";
import {
  BookTextIcon,
  FilePieChartIcon,
  GoalIcon,
  HammerIcon,
  User2Icon,
} from "lucide-react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { getEnrollmentsByAuthorizedUser } from "@/lib/requests/enrollment";
import { StarRating } from "@/components/ui/rating-stars";
import { getDropletAverageRating } from "@/lib/requests/enrollment";

type Props = {
  params: Promise<params>;
};

type params = {
  slug: string;
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
      authorized_users: { populate: "*" },
      prerequisites: { populate: ["id", "name", "slug"] },
      postrequisites: { populate: ["id", "name", "slug"] },
    },
  });
  if (!droplet) return notFound();

  // Get enrollment status
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
        <div className="max-w-2xl mx-auto">
          <div className="flex flex-row flex-0 flex-wrap gap-1.5">
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

            {(await getDropletAverageRating(droplet)) != 0 ? (
              <StarRating
                value={await getDropletAverageRating(droplet)}
                enrollmentID={""}
                average={true}
              ></StarRating>
            ) : null}
          </div>
          <h1 className="mt-3 text-6xl font-black text-slate-900">
            {droplet.name}
          </h1>
          {droplet.description ? (
            <p className="mt-3 text-slate-500 text-pretty md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-slate-400">
              {droplet.description}
            </p>
          ) : null}
        </div>
      </GradientBackground>

      <div className="w-full max-w-2xl py-4 mx-auto space-y-8 lg:py-8 md:space-y-12">
        {droplet.overview ? (
          <section>
            <h2 className="text-2xl font-bold text-slate-900">Overview</h2>

            <div className="w-full p-8 mt-4 border rounded-md bg-slate-50 border-slate-200">
              <div
                className="mx-auto prose prose-sky"
                dangerouslySetInnerHTML={{ __html: droplet.overview }}
              ></div>
            </div>
          </section>
        ) : null}

        {droplet.prerequisites && droplet.prerequisites.length > 0 ? (
          <section>
            <h2 className="text-2xl font-bold text-slate-900">
              Recommended Background
            </h2>
            <p className="text-slate-500">
              Before beginning, we recommend completing the following Droplets:
            </p>

            <ul className="grid grid-flow-row grid-cols-1 gap-4 mt-4 sm:grid-cols-2">
              {droplet.prerequisites.map((droplet) => (
                <DropletTile key={droplet.id} droplet={droplet} />
              ))}
            </ul>
          </section>
        ) : null}

        <section>
          <h2 className="text-2xl font-bold text-slate-900">
            Learning Objectives
          </h2>
          <p className="text-slate-500">
            By completing this Droplet, you should:
          </p>

          <div className="mt-4 border rounded-md bg-slate-50 border-slate-200">
            <ul className="flex flex-col divide-y divide-slate-200">
              {droplet.learningObjectives.map((objective) => (
                <li
                  key={`objective-${objective.id}`}
                  className="inline-flex items-center gap-2 px-4 py-3 leading-snug"
                >
                  <GoalIcon className="w-5 h-5 mr-0.5 shrink-0" />
                  {objective.objective}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-slate-900">
            What&rsquo;s Inside
          </h2>
          <p className="text-slate-500">
            This Droplet contains the following lessons:
          </p>

          {droplet.droplet_lessons && droplet.droplet_lessons.length > 0 ? (
            <div className="mt-4 border rounded-md bg-slate-50 border-slate-200">
              <ul className="flex flex-col divide-y divide-slate-200">
                {droplet.droplet_lessons
                  .sort((a, b) => a.orderIndex - b.orderIndex)
                  .map((dropletLesson) => {
                    const lesson = dropletLesson.lesson;
                    return (
                      <li
                        key={`lesson-${lesson.id}`}
                        className="inline-flex items-center gap-2 px-4 py-3 leading-snug"
                      >
                        {lesson.type === "activity" ? (
                          <HammerIcon className="w-5 h-5 mr-0.5 shrink-0" />
                        ) : lesson.type === "caseStudy" ? (
                          <FilePieChartIcon className="w-5 h-5 mr-0.5 shrink-0" />
                        ) : (
                          <BookTextIcon className="w-5 h-5 mr-0.5 shrink-0" />
                        )}
                        {lesson.name}
                      </li>
                    );
                  })}
              </ul>
            </div>
          ) : (
            <div className="p-4 mt-2 border rounded-md bg-slate-50 border-slate-200">
              This Droplet does not have any lessons yet. Check back soon!
            </div>
          )}

          {/* {droplet.lessons && droplet.lessons.length > 0 ? (
            <div className="mt-4 border rounded-md bg-slate-50 border-slate-200">
              <ul className="flex flex-col divide-y divide-slate-200">
                {droplet.lessons.map((lesson) => (
                  <li
                    key={`lesson-${lesson.id}`}
                    className="inline-flex items-center gap-2 px-4 py-3 leading-snug"
                  >
                    {lesson.type === "activity" ? (
                      <HammerIcon className="w-5 h-5 mr-0.5 shrink-0" />
                    ) : lesson.type === "caseStudy" ? (
                      <FilePieChartIcon className="w-5 h-5 mr-0.5 shrink-0" />
                    ) : (
                      <BookTextIcon className="w-5 h-5 mr-0.5 shrink-0" />
                    )}
                    {lesson.name}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="p-4 mt-2 border rounded-md bg-slate-50 border-slate-200">
              This Droplet does not have any lessons yet. Check back soon!
            </div>
          )} */}
        </section>

        <section>
          <h2 className="text-2xl font-bold text-slate-900">
            About the Authors
          </h2>
          <p className="text-slate-500">
            This Droplet was written by the following individuals:
          </p>

          <ul className="flex flex-col mt-4 border divide-y rounded-md bg-slate-50 border-slate-200 divide-slate-200">
            {droplet.authorized_users?.map((author) => (
              <li key={`author-${author.id}`} className="inline-flex gap-4 p-4">
                <Avatar variant="round" className="border border-sky-800">
                <AvatarImage
                src={author?.profilePhoto || user?.image || undefined}
              />
             <AvatarFallback>
                {user?.name ? (
                  getInitials(user.name)
                ) : (
                  <User2Icon className="w-4 h-4" />
                )}
              </AvatarFallback>
                </Avatar>

                <div
                  className={!author.bio ? "flex flex-row items-center" : ""}
                >
                  <span className="font-bold leading-relaxed">
                    {author.firstName + " " + author.lastName}
                  </span>

                  {author.bio ? (
                    <p className="text-sm text-slate-600">{author.bio}</p>
                  ) : null}
                </div>
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
    </>
  );
}
