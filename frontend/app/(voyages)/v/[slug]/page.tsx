import { getVoyageBySlug } from "@/lib/requests/voyage";
import { getCachedVoyageEnrollment } from "@/lib/requests/cached";
import { getCachedUser } from "@/lib/requests/cached";
import { getCurrentUser } from "@/lib/auth/session";
import { notFound } from "next/navigation";
import { VoyageTreeMap, TreeNode } from "@/components/voyages/voyage-tree-map";
import { VoyageEnrollButton } from "@/components/voyages/voyage-enroll-button";
import { VoyageProgressBar } from "@/components/voyages/voyage-progress-bar";
import {
  computeNodeStatuses,
  computeCompletionPercentage,
  findFirstIncompleteNode,
} from "@/lib/voyage-progress";
import { VoyagePlaylist, VoyageNode, VoyageEnrollment } from "@/types";
import Link from "next/link";

type Props = {
  params: Promise<Params>;
};

type Params = {
  slug: string;
};

export default async function VoyagePage({ params }: Props) {
  const p = await params;

  // Fetch voyage and current user in parallel
  const [voyage, sessionUser] = await Promise.all([
    getVoyageBySlug(p.slug),
    getCurrentUser(),
  ]);

  if (!voyage) {
    notFound();
  }

  // Fetch authorized user and enrollment in parallel if logged in
  let authUser: Awaited<ReturnType<typeof getCachedUser>> | null = null;
  let enrollment: VoyageEnrollment | null = null;

  if (sessionUser?.email) {
    authUser = await getCachedUser(sessionUser.email);
    if (authUser?.id) {
      enrollment = await getCachedVoyageEnrollment(authUser.id, voyage.id);
    }
  }

  const isAuthenticated = !!sessionUser;
  const isEnrolled = enrollment !== null;

  // Determine which display mode to use: tree nodes or flat playlists
  const voyageNodes: VoyageNode[] = voyage.voyage_nodes ?? [];
  const useTree = voyageNodes.length > 0;

  // Fetch completed node IDs for enrolled users
  let completedNodeIds = new Set<number>();
  if (isEnrolled && authUser?.id) {
    const { getVoyageNodeCompletions } = await import(
      "@/lib/requests/voyage-enrollment"
    );
    const completions = await getVoyageNodeCompletions(authUser.id, voyage.id);
    completedNodeIds = new Set(
      completions
        .map((c) => c.voyageNode?.id)
        .filter((id): id is number => id !== undefined),
    );
  }
  const nodeStatuses = isEnrolled
    ? computeNodeStatuses(voyageNodes, completedNodeIds)
    : new Map<number, "completed" | "available" | "locked">();

  // In preview mode (not enrolled), all nodes show as "available" so the tree is browsable
  const getNodeStatus = (
    node: VoyageNode,
  ): "completed" | "available" | "locked" => {
    if (!isEnrolled) return "available";
    return nodeStatuses.get(node.id) ?? "available";
  };

  // Map VoyageNode[] to TreeNode[] for VoyageTreeMap
  const treeNodes: TreeNode[] = voyageNodes.map((node) => ({
    id: node.id,
    label: node.label,
    slug: node.playlist?.slug,
    dropletCount: node.playlist?.droplets?.length,
    isMainPath: node.isMainPath,
    branchType: node.branchType,
    parentId: node.parentNode?.id ?? null,
    orderIndex: node.orderIndex,
    status: getNodeStatus(node),
  }));

  // Completion metrics (only meaningful when enrolled)
  const completionPercentage = isEnrolled
    ? Math.round(computeCompletionPercentage(voyageNodes, completedNodeIds))
    : 0;

  const requiredNodes = voyageNodes.filter((n) => n.branchType !== "optional");
  const completedCount = isEnrolled
    ? requiredNodes.filter((n) => completedNodeIds.has(n.id)).length
    : 0;

  const totalCount = requiredNodes.length;

  const firstIncompleteNode = isEnrolled
    ? findFirstIncompleteNode(voyageNodes, completedNodeIds)
    : null;
  const firstIncompleteSlug = firstIncompleteNode?.playlist?.slug ?? undefined;

  // Keep for backwards compat in sidebar
  const orderedPlaylists = (voyage.voyage_playlists || [])
    .slice()
    .sort((a: VoyagePlaylist, b: VoyagePlaylist) => a.orderIndex - b.orderIndex)
    .filter((vp: VoyagePlaylist) => vp.playlist?.id && vp.playlist?.slug)
    .map((vp: VoyagePlaylist) => {
      const playlist = vp.playlist!;
      const dropletCount = playlist.droplets?.length ?? 0;
      return {
        id: playlist.id,
        name: playlist.name ?? "",
        slug: playlist.slug,
        dropletCount,
        orderIndex: vp.orderIndex,
      };
    });

  const totalDroplets = useTree
    ? treeNodes.reduce((sum, n) => sum + (n.dropletCount ?? 0), 0)
    : orderedPlaylists.reduce((sum, p) => sum + p.dropletCount, 0);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="mx-auto w-full max-w-[1400px] px-4 py-8">
        <div className="mb-6">
          <Link
            href="/explore?contentType=voyages"
            className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            &larr; Back to Voyages
          </Link>
        </div>

        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Left: Info + node list */}
          <div className="w-full shrink-0 lg:w-72">
            <div className="sticky top-8">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                {voyage.name}
              </h1>
              {voyage.description && (
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
                  {voyage.description}
                </p>
              )}

              {/* Enroll / Continue button or sign-in prompt */}
              <div className="mt-4">
                {!isAuthenticated ? (
                  <Link
                    href="/api/auth/signin"
                    className="block w-full rounded-lg bg-[#297496] px-4 py-2.5 text-center text-sm font-semibold text-slate-900 transition-colors hover:bg-[#1e5a73] dark:text-slate-200"
                  >
                    Sign in to enroll
                  </Link>
                ) : (
                  <VoyageEnrollButton
                    voyageId={voyage.id}
                    enrollment={enrollment}
                    completionPercentage={completionPercentage}
                    firstIncompleteSlug={firstIncompleteSlug}
                  />
                )}
              </div>

              {/* Progress bar — only shown when enrolled */}
              {isEnrolled && useTree && (
                <div className="mt-3">
                  <VoyageProgressBar
                    completionPercentage={completionPercentage}
                    completedCount={completedCount}
                    totalCount={totalCount}
                  />
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-500 dark:text-slate-400">
                <span>
                  <span className="font-semibold text-slate-900 dark:text-slate-200">
                    {useTree
                      ? treeNodes.filter((n) => n.isMainPath).length
                      : orderedPlaylists.length}
                  </span>{" "}
                  playlists
                </span>
                <span>·</span>
                <span>
                  <span className="font-semibold text-slate-900 dark:text-slate-200">
                    {totalDroplets}
                  </span>{" "}
                  droplets
                </span>
              </div>

              {/* Node list */}
              <div className="mt-6">
                <h2 className="mb-3 text-sm font-bold text-slate-700 dark:text-slate-300">
                  Journey
                </h2>
                <div className="flex flex-col gap-1">
                  {useTree
                    ? (() => {
                        let step = 0;
                        return treeNodes
                          .filter((n) => n.isMainPath)
                          .sort((a, b) => a.orderIndex - b.orderIndex)
                          .flatMap((main) => {
                            step++;
                            const branches = treeNodes
                              .filter(
                                (n) => !n.isMainPath && n.parentId === main.id,
                              )
                              .sort((a, b) => a.orderIndex - b.orderIndex);

                            const mainStatus = main.status ?? "available";
                            const isLocked = mainStatus === "locked";
                            const isCompleted = mainStatus === "completed";

                            const mainNode = (
                              <div key={main.id}>
                                {isLocked ? (
                                  <div className="flex cursor-not-allowed items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 opacity-60 dark:border-slate-700 dark:bg-slate-800/50">
                                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-400 text-xs font-bold text-white">
                                      {step}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-sm font-medium text-slate-500 dark:text-slate-400">
                                        {main.label}
                                      </p>
                                      <p className="text-xs text-slate-400">
                                        {main.dropletCount ?? 0} droplets
                                      </p>
                                    </div>
                                    <svg
                                      className="h-4 w-4 shrink-0 text-slate-400"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                      strokeWidth={2}
                                    >
                                      <rect
                                        x="3"
                                        y="11"
                                        width="18"
                                        height="11"
                                        rx="2"
                                      />
                                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                    </svg>
                                  </div>
                                ) : (
                                  <Link
                                    href={`/p/${main.slug ?? ""}`}
                                    className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2 transition-all hover:border-slate-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800"
                                  >
                                    <div
                                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                                      style={{ backgroundColor: "#297496" }}
                                    >
                                      {isCompleted ? "✓" : step}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                                        {main.label}
                                      </p>
                                      <p className="text-xs text-slate-400">
                                        {main.dropletCount ?? 0} droplets
                                      </p>
                                    </div>
                                    {isCompleted && (
                                      <span className="shrink-0 text-green-500">
                                        <svg
                                          className="h-4 w-4"
                                          fill="none"
                                          viewBox="0 0 24 24"
                                          stroke="currentColor"
                                          strokeWidth={2.5}
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M5 13l4 4L19 7"
                                          />
                                        </svg>
                                      </span>
                                    )}
                                  </Link>
                                )}
                              </div>
                            );

                            const branchItems = branches.map((branch) => {
                              const branchStatus = branch.status ?? "available";
                              const branchLocked = branchStatus === "locked";
                              const branchCompleted =
                                branchStatus === "completed";

                              return branchLocked ? (
                                <div
                                  key={branch.id}
                                  className="ml-5 flex cursor-not-allowed items-center gap-2 rounded-lg border border-dashed border-slate-200 bg-slate-100 px-3 py-1.5 opacity-60 dark:border-slate-700 dark:bg-slate-800/30"
                                >
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                                      {branch.label}
                                    </p>
                                    <p className="text-[10px] text-slate-400">
                                      {branch.dropletCount ?? 0} droplets
                                    </p>
                                  </div>
                                  <span
                                    className={`shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase ${
                                      branch.branchType === "optional"
                                        ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                        : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                    }`}
                                  >
                                    {branch.branchType === "optional"
                                      ? "optional"
                                      : "required"}
                                  </span>
                                </div>
                              ) : (
                                <Link
                                  key={branch.id}
                                  href={`/p/${branch.slug ?? ""}`}
                                  className="ml-5 flex items-center gap-2 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-1.5 transition-all hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/50"
                                >
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-medium text-slate-700 dark:text-slate-300">
                                      {branch.label}
                                    </p>
                                    <p className="text-[10px] text-slate-400">
                                      {branch.dropletCount ?? 0} droplets
                                    </p>
                                  </div>
                                  {branchCompleted && (
                                    <span className="shrink-0 text-green-500">
                                      <svg
                                        className="h-3.5 w-3.5"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth={2.5}
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          d="M5 13l4 4L19 7"
                                        />
                                      </svg>
                                    </span>
                                  )}
                                  <span
                                    className={`shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase ${
                                      branch.branchType === "optional"
                                        ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                        : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                    }`}
                                  >
                                    {branch.branchType === "optional"
                                      ? "optional"
                                      : "required"}
                                  </span>
                                </Link>
                              );
                            });

                            return [mainNode, ...branchItems];
                          });
                      })()
                    : orderedPlaylists.map((pl, i) => (
                        <Link
                          key={pl.id}
                          href={`/p/${pl.slug}`}
                          className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2 transition-all hover:border-slate-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800"
                        >
                          <div
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                            style={{ backgroundColor: "#297496" }}
                          >
                            {i + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                              {pl.name}
                            </p>
                            <p className="text-xs text-slate-400">
                              {pl.dropletCount} droplets
                            </p>
                          </div>
                        </Link>
                      ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Map (takes remaining space) */}
          <div className="min-w-0 flex-1">
            {treeNodes.length > 0 ? (
              <VoyageTreeMap nodes={treeNodes} />
            ) : (
              <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-slate-300 text-slate-400 dark:border-slate-600">
                No playlists added to this voyage yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
