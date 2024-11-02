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
} from "lucide-react";
import { Metadata } from "next";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<params>;
};

type params = {
  slug: string;
}

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
      authors: { populate: "*" },
      learningObjectives: { populate: "*" },
      lessons: { populate: "*" },
      tags: { populate: "*" },
      prerequisites: { populate: ["id", "name", "slug"] },
      postrequisites: { populate: ["id", "name", "slug"] },
    },
  });
  if (!droplet) return notFound();

  return (
    <>
      <GradientBackground className="px-0">
        <div className="max-w-2xl mx-auto">
          <div className="flex flex-row flex-0 flex-wrap gap-1.5">
            <Badge size="lg" variant="outline">
              {uppercaseFirstChar(droplet.focusArea)}
            </Badge>
            <Badge size="lg" variant="outline">
              {uppercaseFirstChar(droplet.type)}
            </Badge>
            {droplet.tags?.map((tag) => (
              <Badge key={tag.id} size="lg" variant="outline">
                {tag.name}
              </Badge>
            ))}
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

          {droplet.lessons && droplet.lessons.length > 0 ? (
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
          )}
        </section>

        <section>
          <h2 className="text-2xl font-bold text-slate-900">
            About the Authors
          </h2>
          <p className="text-slate-500">
            This Droplet was written by the following individuals:
          </p>

          <ul className="flex flex-col mt-4 border divide-y rounded-md bg-slate-50 border-slate-200 divide-slate-200">
            {droplet.authors?.map((author) => (
              <li key={`author-${author.id}`} className="inline-flex gap-4 p-4">
                <Avatar variant="round" className="border border-sky-800">
                  <AvatarImage
                    src={author.photo?.formats?.small?.url ?? undefined}
                  />
                  <AvatarFallback>{getInitials(author.name)}</AvatarFallback>
                </Avatar>

                <div
                  className={!author.bio ? "flex flex-row items-center" : ""}
                >
                  <span className="font-bold leading-relaxed">
                    {author.name}
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
            <EnrollButton droplet={droplet} />
          </section>
        ) : null}
      </div>
    </>
  );
}
