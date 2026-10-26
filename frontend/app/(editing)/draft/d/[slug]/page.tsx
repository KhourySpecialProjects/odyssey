import { updateDropletFunFact } from "@/lib/requests/droplet";
import {
  getCachedDraftDropletBySlug,
  getCachedDraftDropletOptions,
  getCachedUser,
} from "@/lib/requests/cached";
import { stripHtmlTags } from "@/lib/utils";
import { DropletName } from "@/components/draft/metadata/droplet-name";
import { LearningObjectives } from "@/components/draft/metadata/learning-objectives/learning-objectives";
import { getTags } from "@/lib/requests/tag";
import { NextSteps } from "@/components/draft/metadata/next-steps/next-steps";
import { Overview } from "@/components/draft/metadata/overview";
import { Description } from "@/components/draft/metadata/description";
import { isContentCreator } from "@/lib/utils";
import { Authors } from "@/components/draft/metadata/authors";
import { getCurrentUser } from "@/lib/auth/session";
import { notFound } from "next/navigation";
import Anthropic from "@anthropic-ai/sdk";
import {
  checkRateLimit,
  formatRateLimitError,
} from "@/lib/import/rate-limiter";
import { FunFactEditor } from "@/components/draft/metadata/fun-fact-editor";
import { Datasets } from "@/components/draft/metadata/datasets/datasets";
import { ClickableBadges } from "@/components/draft/metadata/clickable-badges";
import { GeneralInfo } from "@/components/draft/metadata/general-info";
import {
  REVIEW_FROZEN_ERROR,
  REVIEW_FROZEN_MESSAGE,
  isFrozenFor,
} from "@/lib/review-roles";
import { FrozenOverview } from "@/components/draft/metadata/frozen-overview";
import { fetchAuthorizedUsers } from "@/lib/requests/authorized-user";
import { IconLock } from "@tabler/icons-react";

const FUN_FACT_SAVE_ERROR = "Failed to save the fun fact.";

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

  // Same request-deduplicated queries as the draft layout.
  const [authUser, droplet, dropletOptions, tags] = await Promise.all([
    user.email ? getCachedUser(user.email) : null,
    getCachedDraftDropletBySlug(p.slug),
    getCachedDraftDropletOptions(),
    getTags(),
  ]);

  if (!droplet) {
    return <div data-testid={`not-found-message`}>Droplet not found</div>;
  }

  // Prerequisite / similar-droplet choices: visible published droplets only.
  const droplets = dropletOptions
    .filter((option) => option.isHidden === false)
    .map(({ id, name, slug }) => ({ id, name, slug }));

  // While the droplet is in review, an author (any role) can read the draft
  // but not change it, so show it as plain content instead of the editors.
  const isAuthor =
    !!authUser && !!droplet.authorized_users?.some((u) => u.id === authUser.id);
  const frozen =
    droplet.status !== "published" &&
    isFrozenFor(user.roles, droplet.inReview, isAuthor);
  if (frozen) {
    const authorIds = new Set(droplet.authorized_users?.map((u) => u.id));
    const authorNames = (await fetchAuthorizedUsers())
      .filter((u) => authorIds.has(u.id))
      .map((u) => `${u.firstName} ${u.lastName}`.trim());

    return (
      <div className="min-h-screen bg-white pt-6 dark:bg-zinc-950">
        <div
          role="status"
          className="mx-40 mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
        >
          <IconLock className="h-4 w-4 shrink-0" />
          <span>{REVIEW_FROZEN_MESSAGE}</span>
        </div>
        <FrozenOverview droplet={droplet} authorNames={authorNames} />
        <div className="pb-16" />
      </div>
    );
  }

  // Inline Server Actions serialize (encrypted) every value they capture into
  // the page payload, so capture primitives rather than `droplet` / `user`.
  const dropletId = droplet.id;
  const overview = droplet.overview;
  const userEmail = user.email;
  const userRoles = user.roles ?? [];

  const generateFunFact = async () => {
    "use server";

    if (userEmail) {
      const { allowed, retryAfterMs } = checkRateLimit(
        userEmail,
        userRoles,
        "fun-fact",
      );
      if (!allowed) {
        throw new Error(formatRateLimitError(retryAfterMs ?? 0));
      }
    }

    try {
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });

      const msg = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: `Generate a short, one-sentence fun fact about the following overview. Do not include any introductions, explanations, or phrases like "Here's a fun fact." Just output the fact itself. Here is the overview:
 "${overview || "If you're reading this, simply output No Overview"}"`,
          },
        ],
      });

      if (msg.content[0].type === "text") {
        const saved = await updateDropletFunFact(
          msg.content[0].text,
          dropletId,
        );
        if (!saved.success) {
          throw new Error(
            saved.error === REVIEW_FROZEN_ERROR
              ? REVIEW_FROZEN_MESSAGE
              : FUN_FACT_SAVE_ERROR,
          );
        }
        return msg.content[0].text;
      } else {
        return "";
      }
    } catch (error: unknown) {
      console.error("Error generating fun fact:", error);

      // A refused save already has its own message for the editor.
      if (
        error instanceof Error &&
        (error.message === REVIEW_FROZEN_MESSAGE ||
          error.message === FUN_FACT_SAVE_ERROR)
      ) {
        throw error;
      }

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

    await updateDropletFunFact("", dropletId);
  };

  return (
    <>
      <div className="min-h-screen bg-white pt-6 dark:bg-zinc-950">
        <div className="px-40">
          <div className="flex flex-0 flex-row flex-wrap gap-1.5">
            <ClickableBadges
              focusArea={droplet.focusArea}
              type={droplet.type}
              difficulty={droplet.difficulty ?? undefined}
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
            <div className="p-2 dark:text-slate-200">
              This droplet is currently live
            </div>
          )}
          <div
            className={`pt-4 pb-4 ${droplet.status === "draft" && !droplet.inReview && isContentCreator(user.roles) ? "visibility: visible" : "visibility: hidden"} text-red-500 dark:text-red-300`}
          >
            This is currently a draft droplet. Submit it for review, and a
            Content Editor will publish it or request changes.
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
            currentUserId={authUser?.id}
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

          <Datasets dropletId={droplet.id} datasets={droplet.datasets ?? []} />
        </div>
        <div className="pb-16" />
      </div>
    </>
  );
}
