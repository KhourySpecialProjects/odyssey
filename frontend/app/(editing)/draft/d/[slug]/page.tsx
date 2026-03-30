import { updateDropletFunFact, getDroplets } from "@/lib/requests/droplet";
import type { Droplet } from "@/types";
import { getCachedDraftDropletBySlug } from "@/lib/requests/cached";
import { DropletName } from "@/components/draft/metadata/droplet-name";
import { LearningObjectives } from "@/components/draft/metadata/learning-objectives/learning-objectives";
import { getTags } from "@/lib/requests/tag";
import { NextSteps } from "@/components/draft/metadata/next-steps/next-steps";
import { Overview } from "@/components/draft/metadata/overview";
import { Description } from "@/components/draft/metadata/description";
import { isContentCreator } from "@/lib/utils";
import { Authors } from "@/components/draft/metadata/authors";
import { GradientBackground } from "@/components/gradient-bg";
import { getCurrentUser } from "@/lib/auth/session";
import { notFound } from "next/navigation";
import Anthropic from "@anthropic-ai/sdk";
import { FunFactEditor } from "@/components/draft/metadata/fun-fact-editor";
import { ClickableBadges } from "@/components/draft/metadata/clickable-badges";

import { GeneralInfo } from "@/components/draft/metadata/general-info";

type Props = {
  params: Promise<Params>;
};

type Params = {
  slug: string;
};

export async function generateMetadata({ params }: Props) {
  const p = await params;
  const droplet = await getCachedDraftDropletBySlug(p.slug);
  if (!droplet) return {};

  return {
    title: `Draft | ${droplet.name}`,
  };
}

export default async function Droplet({ params }: Props) {
  const p = await params;

  const user = await getCurrentUser();
  if (!user) {
    return notFound();
  }

  const [droplet, droplets, tags] = await Promise.all([
    getCachedDraftDropletBySlug(p.slug),
    getDroplets({
      filters: {
        $and: [{ status: { $eq: "published" } }, { isHidden: false }],
      },
      fields: ["id", "name", "slug"],
      populate: {},
      pagination: { pageSize: 250, page: 1 },
    }),
    getTags(),
  ]);

  if (!droplet) {
    return <div data-testid={`not-found-message`}>Droplet not found</div>;
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
    } catch (error: unknown) {
      console.error("Error generating fun fact:", error);

      // Handle specific error cases
      const status =
        typeof error === "object" && error !== null && "status" in error
          ? (error as { status: number }).status
          : undefined;

      if (status === 529) {
        throw new Error(
          "Anthropic API is currently overloaded. Please try again in a few moments.",
        );
      } else if (status === 429) {
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
              difficulty={droplet.difficulty}
              dropletId={droplet.id}
              selectedTags={droplet.tags ?? []}
              availableTags={tags}
            />
          </div>

          <DropletName
            data-testid="droplet-name"
            dropletId={droplet.id}
            startingName={droplet.name}
          />

          {droplet.status === "published" && (
            <div className="p-2">This droplet is currently live</div>
          )}
          <div
            className={`pt-4 pb-4 ${droplet.status === "draft" && !droplet.inReview && isContentCreator(user.roles) ? "visibility: visible" : "visibility: hidden"} text-red-500 dark:text-red-300`}
          >
            This is currently a draft droplet. To publish this droplet, contact
            a Content Editor or Admin.
          </div>
          {!droplet.inReview &&
            droplet.afterReview !== null &&
            droplet.status === "draft" && (
              <div className="rounded-md border border-slate-400 bg-white p-4 dark:border-slate-500 dark:bg-slate-800 dark:text-slate-200">
                <p className="font-bold">Feedback for Revision:</p>
                <div>{droplet.afterReview}</div>
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
            droplets={droplets}
            prerequisites={droplet.prerequisites ?? []}
            postrequisites={droplet.postrequisites ?? []}
          />
          <FunFactEditor
            funFact={droplet.funFact ?? ""}
            generateFact={generateFunFact}
            deleteFact={deleteFunFact}
          />
        </div>
      </GradientBackground>
    </>
  );
}
