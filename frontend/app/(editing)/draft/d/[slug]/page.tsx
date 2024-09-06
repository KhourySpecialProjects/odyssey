import { getDropletBySlug } from "@/lib/requests/droplet";
import type { Droplet } from "@/types";
import { DropletName } from '@/components/draft/metadata/droplet-name';
import { LearningObjectives } from '@/components/draft/metadata/learning-objectives';
import { Filters } from '@/components/draft/metadata/filters';
import { Requisites } from '@/components/draft/metadata/requisites';
import { getDroplets } from "@/lib/requests/droplet";
import { NextSteps } from '@/components/draft/metadata/next-steps';
import { Overview } from '@/components/draft/metadata/overview';
import { Filter } from '@/components/draft/metadata/filter';
import { Description } from '@/components/draft/metadata/description';
import { uppercaseFirstChar } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

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
      $and: [
        { status: { $eq: "published" } },
        { isHidden: false },
      ]
    }
  }, );
  console.log(droplet.nextSteps)

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
        <Description dropletId={droplet.id} initialContent={droplet.description ?? ""} />
      </div>
      
      <div className="w-full max-w-2xl space-y-4">
        <Overview dropletId={droplet.id} initialContent={droplet.overview ?? ""}/>

        <LearningObjectives dropletId={droplet.id} learningObjectives={droplet.learningObjectives}/>
        <div className="flex items-center justify-center">
          <div className="flex flex-row space-x-5">
            <Filter dropletId={droplet.id} initial={droplet.focusArea}  variant="focusArea"/>
            <Filter dropletId={droplet.id} initial={droplet.type}  variant="type"/>
          </div>
        </div>
        <Requisites prerequisite dropletId={droplet.id} droplets={droplets} selectedDroplets={droplet.prerequisites ?? []}/>
        <Requisites dropletId={droplet.id} droplets={droplets} selectedDroplets={droplet.postrequisites ?? []}/>
        <NextSteps dropletId={droplet.id} initial={droplet.nextSteps ?? []}/>
        
      </div>
      
      
      

      
    </>
  );
}
