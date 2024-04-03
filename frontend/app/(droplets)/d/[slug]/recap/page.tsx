import { DropletTile } from "@/components/droplets/droplet-tile";
import { GradientBackground } from "@/components/gradient-bg";
import { getDropletBySlug, getDroplets } from "@/lib/requests/droplet";
import { Droplet } from "@/types";
import { GoalIcon, Link2Icon } from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

type Props = {
  params: {
    slug: string;
  };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const droplet = await getDropletBySlug<Pick<Droplet, "name">>(params.slug, {
    fields: ["name"],
    populate: undefined,
  });
  if (!droplet) return {};

  return {
    title: `Recap | ${droplet.name}`,
  };
}

export default async function DropletRecapRoute({ params }: Props) {
  const droplet = await getDropletBySlug<Droplet>(params.slug, {
    fields: ["*"],
    populate: {
      learningObjectives: { populate: "*" },
      tags: { populate: "*" },
      nextSteps: { populate: "*" },
    },
  });
  if (!droplet) return notFound();

  const dropletRecommendations = await getDroplets({
    fields: ["*"],
    filters: {
      $and: [
        { slug: { $nei: params.slug } },
        droplet.tags && {
          tags: { slug: { $in: droplet.tags.map((tag) => tag.slug) } },
        },
      ],
    },
    pagination: {
      page: 1,
      pageSize: 4,
    },
    populate: { tags: { populate: "*" } },
  });

  return (
    <>
      <GradientBackground className="px-0">
        <div className="max-w-2xl mx-auto">
          <h1 className="mt-3 text-6xl font-black text-slate-900">Recap</h1>
          <p className="mt-3 text-slate-500 text-pretty md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-slate-400">
            <strong>You did it!</strong> Congratulations on completing this
            &ldquo;{droplet.name}
            &rdquo; Droplet.
          </p>
        </div>
      </GradientBackground>

      <div className="w-full max-w-2xl py-8 mx-auto space-y-8 md:space-y-12">
        <section>
          <h2 className="text-2xl font-bold text-slate-900">
            Learning Objectives
          </h2>
          <p className="text-slate-500">
            Now that you have completed this Droplet, you should:
          </p>

          <div className="mt-4 border rounded-md bg-slate-50 border-slate-200">
            <ul className="flex flex-col divide-y divide-slate-200">
              {droplet.learningObjectives.map((objective) => (
                <li
                  key={objective.id}
                  className="inline-flex items-center gap-2 px-4 py-3 leading-snug"
                >
                  <GoalIcon className="w-5 h-5 mr-0.5 shrink-0" />
                  {objective.objective}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {droplet.nextSteps && droplet.nextSteps.length > 0 ? (
          <section>
            <h2 className="text-2xl font-bold text-slate-900">Next Steps</h2>
            <p className="text-slate-500">
              To further your understanding, we recommend exploring:
            </p>

            <div className="mt-4 border rounded-md bg-slate-50 border-slate-200">
              <ul className="flex flex-col divide-y divide-slate-200">
                {droplet.nextSteps.map((resource) => (
                  <li key={resource.id}>
                    <Link
                      href={resource.url}
                      className="inline-flex items-center gap-2 px-4 py-3 leading-snug transition-colors hover:text-sky-700"
                    >
                      <Link2Icon className="w-5 h-5 mr-0.5 shrink-0" />
                      {resource.label ?? resource.url}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}

        {dropletRecommendations && dropletRecommendations.length > 0 ? (
          <section>
            <h2 className="text-2xl font-bold text-slate-900">
              Extend Your Odyssey
            </h2>
            <p className="text-slate-500">
              Have you explored these Droplets yet?
            </p>

            <ul className="grid grid-flow-row grid-cols-1 gap-4 mt-4 sm:grid-cols-2">
              {dropletRecommendations.map((droplet) => (
                <DropletTile key={droplet.id} droplet={droplet} />
              ))}
            </ul>
          </section>
        ) : null}

        {/* {droplet.lessons && droplet.lessons.length > 0 ? (
          <section>
            <Button size="lg" after={<ArrowRightIcon />} asChild>
              <Link href={`/d/${droplet.slug}/${droplet.lessons[0].slug}`}>
                Begin Droplet
              </Link>
            </Button>
          </section>
        ) : null} */}
      </div>
    </>
  );
}
