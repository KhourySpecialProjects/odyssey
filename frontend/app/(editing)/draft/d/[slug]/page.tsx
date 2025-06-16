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
import { isContentEditor, uppercaseFirstChar } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { RegenerateSlugButton } from "@/components/draft/metadata/regenerate-slug";
import { Authors } from "@/components/draft/metadata/authors";
import { GradientBackground } from "@/components/gradient-bg";
import { getCurrentUser } from "@/lib/auth/session";
import { notFound } from "next/navigation";
import { ReviewDroplet } from "@/components/draft/metadata/review-droplet";
import { FunFact } from "@/components/draft/metadata/fun-fact";
import { Anthropic } from '@anthropic-ai/sdk';
import { Droplet } from "lucide-react";
import { Button } from "@/components/ui/button";


type Props = {
  params: Promise<Params>;
};

type Params = {
  slug: string;
};

export async function generateMetadata({ params }: Props) {
  const p = await params;
  const droplet = await getDropletBySlug<Pick<Droplet, "name">>(p.slug, {
    fields: ["name"],
    populate: undefined,
  });
  if (!droplet) return {};

  return {
    title: `Draft | ${droplet.name}`,
  };
}

export default async function Droplet({ params }: Props) {
  const p = await params;
  const droplet = await getDropletBySlug<Droplet>(p.slug, {
    fields: ["*"],
    populate: {
      authorized_users: { populate: "*" },
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
    return <div data-testid={`not-found-message`}>Droplet not found</div>;
  }

  const user = await getCurrentUser();

  if (!user) {
    return notFound();
  }

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY, // defaults to process.env["ANTHROPIC_API_KEY"]
  });

  const msg = await anthropic.messages.create({
    model: "claude-3-haiku-20240307",
    max_tokens: 1024,
    messages: [{ role: "user", content: `I want you to generate a one-sentence fun-fact about this overview. The fact should be interesting and easily understandable. "${droplet.overview || "If you're reading this, simply output No Overview"}"` }],
  });
  console.log(msg);
  console.log(msg.content[0].text)






  return (
    <>
      <GradientBackground className="px-0">
        <div className="mx-auto max-w-2xl px-5 md:px-0">
          <div className="flex flex-0 flex-row flex-wrap gap-1.5">
            <Badge variant="outline">
              {uppercaseFirstChar(droplet.focusArea)}
            </Badge>
            <Badge variant="outline">{uppercaseFirstChar(droplet.type)}</Badge>
            {droplet.tags?.map((tag) => (
              <Badge key={tag.id} variant="outline">
                {tag.name}
              </Badge>
            ))}
          </div>
          <DropletName
            data-testid="droplet-name"
            dropletId={droplet.id}
            startingName={droplet.name}
          />
          <div className="my-3 flex w-full flex-row items-center space-x-10">
            <RegenerateSlugButton droplet={droplet} name={droplet.name} />
          </div>
          <div
            className={`pt-4 pb-4 ${droplet.status === "draft" ? "visibility: visible" : "visibility: hidden"} text-red-500 dark:text-red-300`}
          >
            This is currently a draft droplet. To publish this droplet, contact
            a Website Creator.
          </div>
          {!droplet.inReview &&
            droplet.afterReview !== null &&
            droplet.status === "draft" && (
              <div className="rounded-md border border-slate-400 bg-white p-4 dark:border-slate-500 dark:bg-slate-800 dark:text-slate-200">
                <p className="font-bold">Feedback for Revision:</p>
                <div>{droplet.afterReview}</div>
              </div>
            )}
          {droplet.inReview &&
            isContentEditor(user.roles) &&
            droplet.status === "draft" && (
              <div className="rounded-md dark:text-slate-200">
                <ReviewDroplet name={droplet.name} droplet={droplet} />
              </div>
            )}
        </div>

        <div className="mx-auto mt-10 w-full max-w-2xl space-y-10">
          <Authors
            dropletId={droplet.id}
            selectedIds={droplet.authorized_users?.map((user) => user.id) || []}
          />
          <Description
            dropletId={droplet.id}
            initialContent={droplet.description ?? ""}
          />

          <Overview
            dropletId={droplet.id}
            initialContent={droplet.overview ?? ""}
          />

          <FunFact
            factText={droplet.overview ?? ""} />


          <LearningObjectives
            dropletId={droplet.id}
            learningObjectives={droplet.learningObjectives}
          />

          <NextSteps
            dropletId={droplet.id}
            nextSteps={droplet.nextSteps ?? []}
          />

          <section>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              General Info
            </h1>
            <p className="mb-8 text-slate-500 dark:text-slate-300">
              Information that users will see when they view the droplet{" "}
            </p>
            <div className="flex w-full flex-col space-y-4">
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
      </GradientBackground>
    </>
  );
}
