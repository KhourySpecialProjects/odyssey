import { getVoyageBySlug } from "@/lib/requests/voyage";
import { notFound } from "next/navigation";
import { VoyageMap } from "@/components/voyages/voyage-map";
import { VoyageTreeMap, TreeNode } from "@/components/voyages/voyage-tree-map";
import { VoyagePlaylist } from "@/types";
import Link from "next/link";

type Props = {
  params: Promise<Params>;
};

type Params = {
  slug: string;
};

// Hardcoded skill tree data for "data-science-explorer" to demo the tree layout.
// In production this would come from voyage_nodes in Strapi.
const DEMO_TREE_NODES: TreeNode[] = [
  {
    id: 1,
    label: "Intro to Python",
    slug: "cs-1200-fall-2025-you-pick-2-level-1-droplets",
    dropletCount: 3,
    isMainPath: true,
    branchType: "required",
    parentId: null,
    orderIndex: 0,
    status: "completed",
  },
  {
    id: 2,
    label: "Data Types",
    slug: "cs-1200-fall-2025-you-pick-2-level-2-droplets",
    dropletCount: 16,
    isMainPath: true,
    branchType: "required",
    parentId: null,
    orderIndex: 1,
    status: "completed",
  },
  // Branches off Data Types
  {
    id: 10,
    label: "Pandas",
    slug: "react",
    dropletCount: 2,
    isMainPath: false,
    branchType: "required",
    parentId: 2,
    orderIndex: 0,
    status: "available",
  },
  {
    id: 11,
    label: "NumPy",
    slug: "computers",
    dropletCount: 11,
    isMainPath: false,
    branchType: "required",
    parentId: 2,
    orderIndex: 1,
    status: "available",
  },
  {
    id: 12,
    label: "Matplotlib",
    slug: "so-you-want-todevelop-a-web-app",
    dropletCount: 4,
    isMainPath: false,
    branchType: "optional",
    parentId: 2,
    orderIndex: 2,
    status: "available",
  },
  // Main path continues
  {
    id: 3,
    label: "Data Analysis",
    slug: "computers",
    dropletCount: 11,
    isMainPath: true,
    branchType: "required",
    parentId: null,
    orderIndex: 2,
    status: "locked",
  },
  // Branches off Data Analysis
  {
    id: 30,
    label: "Statistics",
    dropletCount: 5,
    isMainPath: false,
    branchType: "required",
    parentId: 3,
    orderIndex: 0,
    status: "locked",
  },
  {
    id: 31,
    label: "SQL Basics",
    dropletCount: 3,
    isMainPath: false,
    branchType: "optional",
    parentId: 3,
    orderIndex: 1,
    status: "locked",
  },
  {
    id: 32,
    label: "Data Cleaning",
    dropletCount: 4,
    isMainPath: false,
    branchType: "optional",
    parentId: 3,
    orderIndex: 2,
    status: "locked",
  },
  {
    id: 4,
    label: "Final Project",
    isMainPath: true,
    branchType: "required",
    parentId: null,
    orderIndex: 3,
    status: "locked",
  },
  // Branches off Final Project
  {
    id: 20,
    label: "ML Path",
    dropletCount: 7,
    isMainPath: false,
    branchType: "required",
    parentId: 4,
    orderIndex: 0,
    status: "locked",
  },
  {
    id: 21,
    label: "Viz Path",
    dropletCount: 5,
    isMainPath: false,
    branchType: "required",
    parentId: 4,
    orderIndex: 1,
    status: "locked",
  },
];

const TREE_ENABLED_SLUGS = ["data-science-explorer"];

export default async function VoyagePage({ params }: Props) {
  const p = await params;
  const voyage = await getVoyageBySlug(p.slug);

  if (!voyage) {
    notFound();
  }

  const useTree = TREE_ENABLED_SLUGS.includes(p.slug);

  // Legacy S-curve data
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
    ? DEMO_TREE_NODES.filter((n) => n.dropletCount).reduce(
        (sum, n) => sum + (n.dropletCount ?? 0),
        0,
      )
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
          {/* Left: Info + playlist list */}
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

              {/* Enroll button */}
              <button className="mt-4 w-full rounded-lg bg-[#2D6A4F] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1B4332]">
                Enroll in Voyage
              </button>

              <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-500 dark:text-slate-400">
                <span>
                  <span className="font-semibold text-slate-900 dark:text-slate-200">
                    {useTree
                      ? DEMO_TREE_NODES.filter((n) => n.isMainPath).length
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
                {useTree && (
                  <>
                    <span>·</span>
                    <span>
                      <span className="font-semibold text-slate-900 dark:text-slate-200">
                        {
                          DEMO_TREE_NODES.filter(
                            (n) => n.status === "completed",
                          ).length
                        }
                      </span>
                      /{DEMO_TREE_NODES.length} completed
                    </span>
                  </>
                )}
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
                        return DEMO_TREE_NODES.filter((n) => n.isMainPath)
                          .sort((a, b) => a.orderIndex - b.orderIndex)
                          .flatMap((main) => {
                            step++;
                            const branches = DEMO_TREE_NODES.filter(
                              (n) => !n.isMainPath && n.parentId === main.id,
                            ).sort((a, b) => a.orderIndex - b.orderIndex);
                            return [
                              <Link
                                key={main.id}
                                href={`/p/${main.slug ?? ""}`}
                                className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2 transition-all hover:border-slate-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800"
                              >
                                <div
                                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                                  style={{ backgroundColor: "#2D6A4F" }}
                                >
                                  {step}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                                    {main.label}
                                  </p>
                                  <p className="text-xs text-slate-400">
                                    {main.dropletCount ?? 0} droplets
                                  </p>
                                </div>
                              </Link>,
                              ...branches.map((branch) => (
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
                              )),
                            ];
                          });
                      })()
                    : orderedPlaylists.map((p, i) => (
                        <Link
                          key={p.id}
                          href={`/p/${p.slug}`}
                          className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2 transition-all hover:border-slate-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800"
                        >
                          <div
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                            style={{ backgroundColor: "#2D6A4F" }}
                          >
                            {i + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                              {p.name}
                            </p>
                            <p className="text-xs text-slate-400">
                              {p.dropletCount} droplets
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
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
              {useTree ? (
                <VoyageTreeMap nodes={DEMO_TREE_NODES} />
              ) : (
                <VoyageMap playlists={orderedPlaylists} showOceanBackground />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
