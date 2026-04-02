import { updateDropletFunFact, getDroplets } from "@/lib/requests/droplet";
import type { Droplet } from "@/types";
import { getCachedDraftDropletBySlug } from "@/lib/requests/cached";
import { stripHtmlTags } from "@/lib/utils";
import { DropletName } from "@/components/draft/metadata/droplet-name";
import { LearningObjectives } from "@/components/draft/metadata/learning-objectives/learning-objectives";
import { getTags } from "@/lib/requests/tag";
import { NextSteps } from "@/components/draft/metadata/next-steps/next-steps";
import { Overview } from "@/components/draft/metadata/overview";
import { Description } from "@/components/draft/metadata/description";
import {
  isContentCreator,
  isContentEditor,
  isAuthorizedUserFaculty,
  isAuthorizedUserAdmin,
} from "@/lib/utils";
import { Authors } from "@/components/draft/metadata/authors";
import { getCurrentUser } from "@/lib/auth/session";
import { notFound } from "next/navigation";
import Anthropic from "@anthropic-ai/sdk";
import { FunFactEditor } from "@/components/draft/metadata/fun-fact-editor";
import { ClickableBadges } from "@/components/draft/metadata/clickable-badges";
import { GeneralInfo } from "@/components/draft/metadata/general-info";
import { ContentActionButton } from "@/components/draft/metadata/content-action-button";
import Link from "next/link";

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
      <div className="min-h-screen bg-white pt-6 dark:bg-zinc-950">
        <div className="px-40">
          <div className="flex flex-0 flex-row flex-wrap gap-1.5">
            <ClickableBadges
              focusArea={droplet.focusArea}
              type={droplet.type}
              dropletId={droplet.id}
              selectedTags={droplet.tags ?? []}
              availableTags={tags}
            />
          </div>

          <div className="mt-6">
            <DropletName
              data-testid="droplet-name"
              dropletId={droplet.id}
              startingName={droplet.name}
            />
          </div>
          {droplet.description ? (
            <p className="mt-3 text-pretty text-slate-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-slate-300">
              {stripHtmlTags(droplet.description)}
            </p>
          ) : null}

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

        <div className="w-full space-y-10 px-40 pt-6">
          <Authors
            dropletId={droplet.id}
            selectedIds={droplet.authorized_users?.map((user) => user.id) || []}
          />

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <Description
              dropletId={droplet.id}
              initialContent={droplet.description ?? ""}
            />
            <Overview
              dropletId={droplet.id}
              initialContent={droplet.overview ?? ""}
            />
          </div>

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

          {/* Bottom action bar */}
          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 py-6 dark:border-slate-700">
            {/* Edit Draft */}
            {droplet.originalDropletId && droplet.status === "draft" && (
              <>
                {!droplet.inReview && isContentCreator(user.roles) && (
                  <ContentActionButton
                    droplet={droplet}
                    actionType="requestReview"
                    buttonText={
                      droplet.afterReview
                        ? "Re-Request Review"
                        : "Request Review"
                    }
                  />
                )}
                {droplet.inReview &&
                  (isContentEditor(user.roles) ||
                    isAuthorizedUserFaculty(user.roles) ||
                    isAuthorizedUserAdmin(user.roles)) && (
                    <ContentActionButton
                      droplet={droplet}
                      actionType="requestChanges"
                      buttonText="Request Changes"
                    />
                  )}
                {(isAuthorizedUserAdmin(user.roles) ||
                  isAuthorizedUserFaculty(user.roles) ||
                  (isContentEditor(user.roles) && droplet.inReview)) && (
                  <ContentActionButton
                    droplet={droplet}
                    actionType="publishDraft"
                    buttonText="Publish Changes"
                  />
                )}
              </>
            )}

            {/* Regular Draft */}
            {!droplet.originalDropletId && (
              <>
                {!droplet.inReview &&
                  droplet.status === "draft" &&
                  isContentCreator(user.roles) && (
                    <ContentActionButton
                      droplet={droplet}
                      actionType="requestReview"
                      buttonText={
                        droplet.afterReview
                          ? "Re-Request Review"
                          : "Request Review"
                      }
                    />
                  )}
                {droplet.inReview &&
                  droplet.status === "draft" &&
                  (isContentEditor(user.roles) ||
                    isAuthorizedUserAdmin(user.roles)) && (
                    <ContentActionButton
                      droplet={droplet}
                      actionType="requestChanges"
                      buttonText="Request Changes"
                    />
                  )}
                {droplet.status === "draft" &&
                  (isAuthorizedUserFaculty(user.roles) ||
                    isAuthorizedUserAdmin(user.roles) ||
                    (isContentEditor(user.roles) && droplet.inReview)) && (
                    <ContentActionButton
                      droplet={droplet}
                      actionType="publish"
                      buttonText="Publish Droplet"
                    />
                  )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
