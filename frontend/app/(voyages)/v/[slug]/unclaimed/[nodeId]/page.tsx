import { fetchAPI } from "@/lib/utils";
import { VoyageNode } from "@/types";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { getCurrentUser } from "@/lib/auth/session";
import { getCachedUser } from "@/lib/requests/cached";
import {
  isAuthorizedUserAdmin,
  isAuthorizedUserFaculty,
  isContentCreator,
  isContentEditor,
} from "@/lib/utils";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ClaimNodeButton } from "@/components/voyages/claim-node-button";
import { ContentCreatorRequestForm } from "@/components/requests/content-creation-request";
import { fetchCreationRequestByUser } from "@/lib/actions";
import { PendingRequestCard } from "@/components/requests/pending-request-card";

type Props = {
  params: Promise<{ slug: string; nodeId: string }>;
};

export default async function UnclaimedDropletPage({ params }: Props) {
  const p = await params;
  const nodeId = parseInt(p.nodeId, 10);
  if (isNaN(nodeId)) return notFound();

  const nodes = await fetchAPI<VoyageNode[]>("/voyage-nodes", {
    urlParams: {
      filters: { id: { $eq: nodeId } },
      fields: ["id", "label", "nodeType", "claimStatus"],
      populate: {
        voyage: { fields: ["id", "name", "slug"] },
        claimedBy: { fields: ["id", "name"] },
        droplet: { fields: ["id", "slug"] },
      },
      pagination: { pageSize: 1, page: 1 },
    },
    next: { tags: [CACHE_TAGS.voyages], revalidate: 0 },
  });

  const node = nodes[0];
  if (!node || node.nodeType !== "droplet") return notFound();
  if (node.voyage?.slug && node.voyage.slug !== p.slug) return notFound();

  if (node.droplet?.slug) {
    redirect(`/d/${node.droplet.slug}`);
  }

  const voyageName = node.voyage?.name ?? "Voyage";
  const voyageSlug = node.voyage?.slug ?? p.slug;

  const sessionUser = await getCurrentUser();
  const authUser = sessionUser?.email
    ? await getCachedUser(sessionUser.email)
    : null;

  const canClaim =
    !!sessionUser &&
    (isContentCreator(sessionUser.roles) ||
      isContentEditor(sessionUser.roles) ||
      isAuthorizedUserFaculty(sessionUser.roles) ||
      isAuthorizedUserAdmin(sessionUser.roles));

  const isClaimed = node.claimStatus === "claimed";
  const isUnclaimed = node.claimStatus === "unclaimed";

  const existingRequest = authUser
    ? await fetchCreationRequestByUser(authUser.id)
    : null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-8 dark:bg-zinc-950">
      <div className="w-full max-w-lg text-center">
        <Link
          href={`/v/${voyageSlug}`}
          className="mb-8 inline-block text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          &larr; Back to {voyageName}
        </Link>

        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#297496]/10 dark:bg-[#297496]/20">
          <svg
            className="h-10 w-10 text-[#297496]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
            />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          {node.label}
        </h1>

        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Part of{" "}
          <Link
            href={`/v/${voyageSlug}`}
            className="font-medium text-[#297496] hover:underline"
          >
            {voyageName}
          </Link>
        </p>

        <div className="mt-10">
          {isClaimed && node.claimedBy ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-6 py-8 dark:border-slate-700 dark:bg-slate-800/50">
              <p className="text-lg font-medium text-slate-700 dark:text-slate-300">
                Being written by
              </p>
              <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                {node.claimedBy.name}
              </p>
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                This droplet is currently being authored. Check back soon!
              </p>
            </div>
          ) : isUnclaimed && canClaim ? (
            <div className="rounded-xl border-2 border-[#297496]/30 bg-[#297496]/5 px-6 py-8 dark:border-[#297496]/50 dark:bg-[#297496]/10">
              <p className="text-xl font-bold text-slate-900 dark:text-white">
                This droplet needs you!
              </p>
              <p className="mt-2 text-slate-600 dark:text-slate-300">
                Be the first to write content for this topic. Claim it and start
                creating.
              </p>
              <div className="mt-6">
                <ClaimNodeButton voyageNodeId={nodeId} />
              </div>
            </div>
          ) : isUnclaimed && !canClaim && sessionUser ? (
            <div className="mt-4 text-left">
              {existingRequest ? (
                <PendingRequestCard />
              ) : (
                <ContentCreatorRequestForm
                  user={authUser ?? undefined}
                  voyageNodeId={nodeId}
                  voyageName={voyageName}
                  nodeLabel={node.label}
                />
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-6 py-8 dark:border-slate-700 dark:bg-slate-800/50">
              <p className="text-lg font-medium text-slate-700 dark:text-slate-300">
                This droplet hasn&apos;t been written yet.
              </p>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Sign in to apply to write this droplet.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
