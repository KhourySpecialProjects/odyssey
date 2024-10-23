import { getDropletBySlug } from "@/lib/requests/droplet";
import type { Droplet } from "@/types";
import { DropletName } from "@/components/draft/metadata/droplet-name";
import { LearningObjectives } from "@/components/draft/metadata/learning-objectives/learning-objectives";
import { Selection } from "@/components/draft/metadata/selection";
import { getDroplets } from "@/lib/requests/droplet";
import { getTags } from "@/lib/requests/tag";
import { NextSteps } from "@/components/draft/metadata/next-steps/next-steps";
import { Overview } from "@/components/draft/metadata/overview";
import { Filter } from "@/components/draft/metadata/filter";
import { Description } from "@/components/draft/metadata/description";
import { uppercaseFirstChar } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { RegenerateSlugButton } from "@/components/draft/metadata/regenerate-slug";
import { DeleteDropletButton } from "@/components/draft/metadata/delete-droplet";

type Props = {
  params: {
    slug: string;
  };
};

export async function generateMetadata({ params }: Props) {
  const droplet = await getDropletBySlug<Pick<Droplet, "name">>(params.slug, {
    fields: ["name"],
    populate: undefined,
  });
  if (!droplet) return {};

  return {
    title: `Draft | ${droplet.name}`,
  };
}

export default async function Droplet({ params }: Props) {
  const droplet = await getDropletBySlug<Droplet>(params.slug, {
    fields: ["*"],
    populate: {
      authors: { populate: "*" },
      learningObjectives: { populate: "*" },
      lessons: { populate: "*" },
      tags: { populate: "*" },
      prerequisites: { populate: ["id", "name", "slug"] },
      postrequisites: { populate: ["id", "name", "slug"] },
      nextSteps: { fields: ["label", "url"] },
    },
  });
  const droplets = await getDroplets({
    filters: {
      $and: [{ status: { $eq: "published" } }, { isHidden: false }],
    },
  });

  const tags = await getTags();

  if (!droplet) {
    return <div>Droplet not found</div>;
  }

  return (
    <>
      <div className="w-full max-w-2xl">
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
        <DropletName dropletId={droplet.id} startingName={droplet.name} />
        <div className="flex flex-row w-full  items-center space-x-10 my-3">
          <RegenerateSlugButton dropletId={droplet.id} name={droplet.name} />
          <DeleteDropletButton dropletId={droplet.id} />
        </div>
        <Description
          dropletId={droplet.id}
          initialContent={droplet.description ?? ""}
        />
      </div>

      <div className="w-full max-w-2xl space-y-10 mt-10">
        <Overview
          dropletId={droplet.id}
          initialContent={droplet.overview ?? ""}
        />

        <LearningObjectives
          dropletId={droplet.id}
          learningObjectives={droplet.learningObjectives}
        />

        <NextSteps dropletId={droplet.id} nextSteps={droplet.nextSteps ?? []} />

        <section>
          <h1 className="text-2xl font-bold text-slate-900 ">General Info</h1>
          <p className="text-slate-500 mb-8">
            Information that users will see when they view the droplet{" "}
          </p>
          <div className="w-full flex flex-col space-y-4">
            <div className="flex items-center justify-center">
              <div className="flex flex-row space-x-5">
                <Filter
                  dropletId={droplet.id}
                  initial={droplet.focusArea}
                  variant="focusArea"
                />
                <Filter
                  dropletId={droplet.id}
                  initial={droplet.type}
                  variant="type"
                />
              </div>
            </div>
            <Selection
              variant="tag"
              dropletId={droplet.id}
              items={tags}
              selectedItems={droplet.tags ?? []}
            />
            <Selection
              variant="prerequisite"
              dropletId={droplet.id}
              items={droplets}
              selectedItems={droplet.prerequisites ?? []}
            />
            <Selection
              variant="postrequisite"
              dropletId={droplet.id}
              items={droplets}
              selectedItems={droplet.postrequisites ?? []}
            />
          </div>
        </section>
      </div>
    </>
  );
}
