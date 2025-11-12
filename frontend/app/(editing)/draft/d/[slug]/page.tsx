import {
  getDropletBySlug,
  updateDroplet,
  updateDropletFunFact,
} from "@/lib/requests/droplet";
import type { Droplet } from "@/types";
import { DropletName } from "@/components/draft/metadata/droplet-name";
import { LearningObjectives } from "@/components/draft/metadata/learning-objectives/learning-objectives";
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
import Anthropic from "@anthropic-ai/sdk";
import { FunFactEditor } from "@/components/draft/metadata/fun-fact-editor";
import { ClickableBadges } from "@/components/draft/metadata/clickable-badges";

import { GeneralInfo } from "@/components/draft/metadata/general-info";
import { RequestReviewButton } from "@/components/draft/metadata/request-review";

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
      prerequisites: { populate: "*" },
      postrequisites: { populate: "*" },
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

  const generateFunFact = async () => {
    "use server";

    try {
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });

      const msg = await anthropic.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: `Generate a short, one-sentence fun fact about the following overview. Do not include any introductions, explanations, or phrases like "Here's a fun fact." Just output the fact itself. Here is the overview:
 "${droplet.overview || "If you're reading this, simply output No Overview"}"`,
          },
        ],
      });

      if (msg.content[0].type === "text") {
        await updateDropletFunFact(msg.content[0].text, droplet.id);
        return msg.content[0].text;
      } else {
        return "";
      }
    } catch (error: any) {
      console.error("Error generating fun fact:", error);

      // Handle specific error cases
      if (error.status === 529) {
        throw new Error(
          "Anthropic API is currently overloaded. Please try again in a few moments.",
        );
      } else if (error.status === 429) {
        throw new Error(
          "Rate limit exceeded. Please wait before trying again.",
        );
      } else {
        throw new Error("Failed to generate fun fact. Please try again.");
      }
    }
  };

  const deleteFunFact = async () => {
    "use server";

    await updateDropletFunFact("", droplet.id);
  };

  return (
    <>
      <GradientBackground className="px-0">
        <div className="mx-auto max-w-2xl px-5 md:px-0">
          <div className="flex flex-0 flex-row flex-wrap gap-1.5">
            <ClickableBadges
              focusArea={droplet.focusArea}
              type={droplet.type}
              dropletId={droplet.id}
              tags={droplet.tags ?? []}
              selectedTags={droplet.tags ?? []}
              availableTags={tags}
            />
          </div>

          <DropletName
            data-testid="droplet-name"
            dropletId={droplet.id}
            startingName={droplet.name}
          />

          {droplet.status === "draft" && droplet.inReview && (
            <div className="p-2">Droplet currently in review</div>
          )}
          <div
            className={`pt-4 pb-4 ${droplet.status === "draft" ? "visibility: visible" : "visibility: hidden"} text-red-500 dark:text-red-300`}
          >
            This is currently a draft droplet. To publish this droplet, contact
            a Content Editor or Faculty.
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

        <div className="mx-auto w-full max-w-2xl space-y-10">
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

          <LearningObjectives
            dropletId={droplet.id}
            learningObjectives={droplet.learningObjectives}
          />

          <NextSteps
            dropletId={droplet.id}
            nextSteps={droplet.nextSteps ?? []}
          />

          <GeneralInfo
            dropletId={droplet.id}
            tags={tags}
            selectedTags={droplet.tags ?? []}
            droplets={droplets}
            prerequisites={droplet.prerequisites ?? []}
            postrequisites={droplet.postrequisites ?? []}
          />
          <FunFactEditor
            funFact={droplet.funFact ?? ""}
            generateFact={generateFunFact}
            deleteFact={deleteFunFact}
          />
          {!droplet.inReview && droplet.status === "draft" && (
            <RequestReviewButton droplet={droplet} />
          )}
        </div>
      </GradientBackground>
    </>
  );
}
