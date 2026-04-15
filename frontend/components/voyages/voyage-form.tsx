"use client";

import {
  useState,
  useTransition,
  useMemo,
  useCallback,
  useEffect,
} from "react";
import {
  VoyageFormTour,
  VOYAGE_TOUR_KEY,
} from "@/components/voyages/voyage-form-tour";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Droplet, Playlist, Voyage } from "@/types";
import { cn } from "@/lib/utils";
import {
  createVoyageWithNodes,
  updateVoyageWithNodes,
} from "@/lib/requests/voyage";
import { VoyageTreeSchema } from "@/lib/validations/voyage";
import { VoyageTreeMap, TreeNode } from "@/components/voyages/voyage-tree-map";
import {
  ChevronUpIcon,
  ChevronDownIcon,
  XIcon,
  SearchIcon,
  PlusIcon,
  BookOpenIcon,
  DropletIcon,
  CircleDashedIcon,
} from "lucide-react";

type NodeMode = "playlist" | "droplet" | "placeholder";

interface SelectedNode {
  localId: string;
  nodeType: "playlist" | "droplet";
  playlistId: number | null;
  dropletId: number | null;
  name: string;
  slug: string;
  dropletCount: number;
  isMainPath: boolean;
  branchType: "required" | "optional";
  parentLocalId: string | null;
  orderIndex: number;
  claimStatus?: "unclaimed" | "claimed" | "authored" | null;
  claimedById?: number | null;
}

interface VoyageFormProps {
  playlists: Playlist[];
  droplets: Droplet[];
  authorId: number;
  voyage?: Voyage;
}

function generateLocalId(): string {
  return crypto.randomUUID();
}

function initNodesFromVoyage(voyage: Voyage): SelectedNode[] {
  const nodes = voyage.voyage_nodes ?? [];
  // Build a lookup from Strapi node ID → generated localId for resolving parentLocalId
  const nodeIdToLocalId = new Map<number, string>();
  const localIds = nodes.map(() => generateLocalId());
  for (let i = 0; i < nodes.length; i++) {
    nodeIdToLocalId.set(nodes[i].id, localIds[i]);
  }

  return nodes.map((n, i) => ({
    localId: localIds[i],
    nodeType: n.nodeType === "droplet" ? "droplet" : "playlist",
    playlistId: n.playlist?.id ?? null,
    dropletId: n.droplet?.id ?? null,
    name: n.droplet?.name ?? n.playlist?.name ?? n.label,
    slug: n.droplet?.slug ?? n.playlist?.slug ?? "",
    dropletCount:
      n.nodeType === "droplet"
        ? n.droplet
          ? 1
          : 0
        : n.playlist?.droplets?.length ?? 0,
    isMainPath: n.isMainPath,
    branchType: n.branchType,
    parentLocalId: n.parentNode?.id
      ? nodeIdToLocalId.get(n.parentNode.id) ?? null
      : null,
    orderIndex: n.orderIndex,
    claimStatus: n.claimStatus ?? null,
    claimedById: n.claimedBy?.id ?? null,
  }));
}

export function VoyageForm({
  playlists,
  droplets,
  authorId,
  voyage,
}: VoyageFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEditing = !!voyage;

  const [name, setName] = useState(voyage?.name ?? "");
  const [description, setDescription] = useState(voyage?.description ?? "");
  const [searchQuery, setSearchQuery] = useState("");
  const [placeholderLabel, setPlaceholderLabel] = useState("");
  const [nodeMode, setNodeMode] = useState<NodeMode>("playlist");
  const [selectedNodes, setSelectedNodes] = useState<SelectedNode[]>(
    voyage ? initNodesFromVoyage(voyage) : [],
  );
  const [isSequential, setIsSequential] = useState(
    voyage?.isSequential ?? false,
  );
  const [error, setError] = useState("");

  // Spotlight tour
  const [runTour, setRunTour] = useState(false);
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      !localStorage.getItem(VOYAGE_TOUR_KEY)
    ) {
      setRunTour(true);
    }
  }, []);

  const availablePlaylists = useMemo(
    () =>
      playlists.filter(
        (p) =>
          !selectedNodes.some(
            (n) => n.nodeType === "playlist" && n.playlistId === p.id,
          ) && p.name.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [playlists, selectedNodes, searchQuery],
  );

  const availableDroplets = useMemo(
    () =>
      droplets.filter(
        (d) =>
          !selectedNodes.some(
            (n) => n.nodeType === "droplet" && n.dropletId === d.id,
          ) && d.name.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [droplets, selectedNodes, searchQuery],
  );

  // All main-path nodes (for the "Branches from" select options)
  const mainPathNodes = useMemo(
    () => selectedNodes.filter((n) => n.isMainPath),
    [selectedNodes],
  );

  const addPlaylist = useCallback((playlist: Playlist) => {
    const dropletCount = playlist.droplets?.length ?? 0;
    setSelectedNodes((prev) => {
      const mainCount = prev.filter((n) => n.isMainPath).length;
      return [
        ...prev,
        {
          localId: generateLocalId(),
          nodeType: "playlist" as const,
          playlistId: playlist.id,
          dropletId: null,
          name: playlist.name,
          slug: playlist.slug,
          dropletCount,
          isMainPath: true,
          branchType: "required",
          parentLocalId: null,
          orderIndex: mainCount,
        },
      ];
    });
    setSearchQuery("");
  }, []);

  const addDroplet = useCallback((droplet: Droplet) => {
    setSelectedNodes((prev) => {
      const mainCount = prev.filter((n) => n.isMainPath).length;
      return [
        ...prev,
        {
          localId: generateLocalId(),
          nodeType: "droplet" as const,
          playlistId: null,
          dropletId: droplet.id,
          name: droplet.name,
          slug: droplet.slug,
          dropletCount: 1,
          isMainPath: true,
          branchType: "required",
          parentLocalId: null,
          orderIndex: mainCount,
        },
      ];
    });
    setSearchQuery("");
  }, []);

  const addPlaceholder = useCallback(() => {
    const label = placeholderLabel.trim();
    if (!label) return;
    setSelectedNodes((prev) => {
      const mainCount = prev.filter((n) => n.isMainPath).length;
      return [
        ...prev,
        {
          localId: generateLocalId(),
          nodeType: "droplet" as const,
          playlistId: null,
          dropletId: null,
          name: label,
          slug: "",
          dropletCount: 0,
          isMainPath: true,
          branchType: "required",
          parentLocalId: null,
          orderIndex: mainCount,
        },
      ];
    });
    setPlaceholderLabel("");
  }, [placeholderLabel]);

  const removeNode = useCallback((localId: string) => {
    setSelectedNodes((prev) => {
      // When removing a node, also remove any branch nodes that depend on it
      const filtered = prev.filter(
        (n) => n.localId !== localId && n.parentLocalId !== localId,
      );
      // Reindex main path orderIndex
      let mainIdx = 0;
      return filtered.map((n) => {
        if (n.isMainPath) {
          return { ...n, orderIndex: mainIdx++ };
        }
        return n;
      });
    });
  }, []);

  const moveUp = useCallback((localId: string) => {
    setSelectedNodes((prev) => {
      const mainNodes = prev
        .filter((n) => n.isMainPath)
        .sort((a, b) => a.orderIndex - b.orderIndex);
      const idx = mainNodes.findIndex((n) => n.localId === localId);
      if (idx <= 0) return prev;

      // Swap orderIndex values
      const idA = mainNodes[idx - 1].localId;
      const idB = mainNodes[idx].localId;
      return prev.map((n) => {
        if (n.localId === idA) return { ...n, orderIndex: idx };
        if (n.localId === idB) return { ...n, orderIndex: idx - 1 };
        return n;
      });
    });
  }, []);

  const moveDown = useCallback((localId: string) => {
    setSelectedNodes((prev) => {
      const mainNodes = prev
        .filter((n) => n.isMainPath)
        .sort((a, b) => a.orderIndex - b.orderIndex);
      const idx = mainNodes.findIndex((n) => n.localId === localId);
      if (idx < 0 || idx >= mainNodes.length - 1) return prev;

      const idA = mainNodes[idx].localId;
      const idB = mainNodes[idx + 1].localId;
      return prev.map((n) => {
        if (n.localId === idA) return { ...n, orderIndex: idx + 1 };
        if (n.localId === idB) return { ...n, orderIndex: idx };
        return n;
      });
    });
  }, []);

  const setParent = useCallback(
    (localId: string, parentLocalId: string | null) => {
      setSelectedNodes((prev) => {
        // Recompute main-path orderIndex after structure change
        const updated = prev.map((n) => {
          if (n.localId !== localId) {
            // If this node was a child of the node being converted to branch,
            // promote it to main path to avoid orphaning
            if (parentLocalId !== null && n.parentLocalId === localId) {
              return { ...n, isMainPath: true, parentLocalId: null };
            }
            return n;
          }
          if (parentLocalId === null) {
            // Promoting to main path
            const mainCount = prev.filter((p) => p.isMainPath).length;
            return {
              ...n,
              isMainPath: true,
              parentLocalId: null,
              orderIndex: mainCount,
            };
          }
          return {
            ...n,
            isMainPath: false,
            parentLocalId,
            orderIndex: 0,
          };
        });
        // Reindex main-path orderIndex sequentially
        let mainIdx = 0;
        return updated.map((n) => {
          if (n.isMainPath) return { ...n, orderIndex: mainIdx++ };
          return n;
        });
      });
    },
    [],
  );

  const setBranchType = useCallback(
    (localId: string, branchType: "required" | "optional") => {
      setSelectedNodes((prev) =>
        prev.map((n) => (n.localId === localId ? { ...n, branchType } : n)),
      );
    },
    [],
  );

  // Derive TreeNode[] for VoyageTreeMap preview
  // Use a stable numeric id for the tree map derived from localId index position
  const treeNodes: TreeNode[] = useMemo(() => {
    // Build a map from localId -> numeric index for tree rendering
    const localIdToIndex = new Map<string, number>();
    selectedNodes.forEach((n, i) => localIdToIndex.set(n.localId, i + 1));

    return selectedNodes.map((node) => ({
      id: localIdToIndex.get(node.localId)!,
      label: node.name,
      slug: node.slug || undefined,
      dropletCount: node.dropletCount,
      isMainPath: node.isMainPath,
      branchType: node.branchType,
      parentId: node.parentLocalId
        ? localIdToIndex.get(node.parentLocalId) ?? null
        : null,
      orderIndex: node.orderIndex,
      status: isSequential
        ? node.isMainPath && node.orderIndex === 0
          ? "available"
          : "locked"
        : "available",
      nodeType: node.nodeType,
      claimStatus:
        node.nodeType === "droplet" && !node.dropletId
          ? ("unclaimed" as const)
          : null,
    }));
  }, [selectedNodes, isSequential]);

  // Sort for display: main-path nodes first (by orderIndex), then branch nodes grouped under parent
  const sortedForDisplay = useMemo(() => {
    const mainSorted = selectedNodes
      .filter((n) => n.isMainPath)
      .sort((a, b) => a.orderIndex - b.orderIndex);

    const result: SelectedNode[] = [];
    for (const main of mainSorted) {
      result.push(main);
      const branches = selectedNodes.filter(
        (n) => !n.isMainPath && n.parentLocalId === main.localId,
      );
      result.push(...branches);
    }
    return result;
  }, [selectedNodes]);

  function handleSubmit(status: "draft" | "published") {
    setError("");

    if (!name.trim()) {
      setError("Voyage name is required.");
      return;
    }

    if (selectedNodes.length === 0) {
      setError("At least one island (playlist or droplet) is required.");
      return;
    }

    startTransition(async () => {
      const nodePayload = selectedNodes.map((n) => ({
        localId: n.localId,
        nodeType: n.nodeType,
        playlistId: n.playlistId,
        dropletId: n.dropletId,
        isMainPath: n.isMainPath,
        branchType: n.branchType,
        parentLocalId: n.parentLocalId,
        orderIndex: n.orderIndex,
        label: n.name,
        claimStatus: n.claimStatus,
        claimedById: n.claimedById,
      }));

      // Validate with Zod schema (circular refs, max nodes, max branches, etc.)
      const validation = VoyageTreeSchema.safeParse({
        name: name.trim(),
        description: description.trim() || undefined,
        nodes: nodePayload,
      });
      if (!validation.success) {
        setError(validation.error.issues[0]?.message || "Validation failed.");
        return;
      }

      const result = isEditing
        ? await updateVoyageWithNodes({
            id: voyage.id,
            name: name.trim(),
            description: description.trim() || undefined,
            status,
            isSequential,
            nodes: nodePayload,
          })
        : await createVoyageWithNodes({
            name: name.trim(),
            description: description.trim() || undefined,
            status,
            isSequential,
            nodes: nodePayload,
            authorId,
          });

      if (!result.ok) {
        setError(
          result.error ||
            `Failed to ${isEditing ? "update" : "create"} voyage.`,
        );
        return;
      }

      router.push(`/v/${result.data?.slug}`);
    });
  }

  return (
    <div className="flex w-full flex-col gap-8 lg:flex-row">
      <VoyageFormTour run={runTour} setRun={setRunTour} />
      {/* Left: Form panel */}
      <div className="flex w-full flex-col gap-6 lg:w-1/2">
        {/* Tour trigger */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem(VOYAGE_TOUR_KEY);
              setRunTour(true);
            }}
            className="text-xs text-slate-400 transition-colors hover:text-[#297496]"
          >
            Take a tour
          </button>
        </div>
        {/* Name */}
        <div id="tour-voyage-name" className="flex flex-col gap-2">
          <Label htmlFor="voyage-name">
            Voyage Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="voyage-name"
            placeholder="e.g. Introduction to Machine Learning"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isPending}
          />
        </div>

        {/* Description */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="voyage-description">Description</Label>
          <textarea
            id="voyage-description"
            className="min-h-[100px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:ring-2 focus:ring-slate-400 focus:outline-none disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
            placeholder="Describe what students will learn on this voyage..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isPending}
          />
        </div>

        {/* Node picker */}
        <div className="flex flex-col gap-3">
          <Label>Islands</Label>

          {/* Node type selector */}
          <div
            id="tour-node-type-tabs"
            className="flex overflow-hidden rounded-md border border-slate-200 dark:border-slate-600"
          >
            <button
              type="button"
              onClick={() => {
                setNodeMode("playlist");
                setSearchQuery("");
                setPlaceholderLabel("");
              }}
              disabled={isPending}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors",
                nodeMode === "playlist"
                  ? "bg-[#297496] text-white"
                  : "bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800",
              )}
            >
              <BookOpenIcon className="h-3.5 w-3.5" />
              Playlist
            </button>
            <button
              type="button"
              onClick={() => {
                setNodeMode("droplet");
                setSearchQuery("");
                setPlaceholderLabel("");
              }}
              disabled={isPending}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 border-x border-slate-200 px-3 py-1.5 text-xs font-medium transition-colors dark:border-slate-600",
                nodeMode === "droplet"
                  ? "bg-[#297496] text-white"
                  : "bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800",
              )}
            >
              <DropletIcon className="h-3.5 w-3.5" />
              Droplet
            </button>
            <button
              type="button"
              onClick={() => {
                setNodeMode("placeholder");
                setSearchQuery("");
              }}
              disabled={isPending}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors",
                nodeMode === "placeholder"
                  ? "bg-[#297496] text-white"
                  : "bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800",
              )}
            >
              <CircleDashedIcon className="h-3.5 w-3.5" />
              Placeholder
            </button>
          </div>

          {/* Playlist search */}
          {nodeMode === "playlist" && (
            <>
              <div className="relative">
                <SearchIcon className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  className="pl-9"
                  placeholder="Search public playlists..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  disabled={isPending}
                />
              </div>

              <div className="max-h-48 overflow-y-auto rounded-md border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                {availablePlaylists.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-slate-500">
                    {searchQuery
                      ? "No playlists found."
                      : "No playlists available."}
                  </p>
                ) : (
                  availablePlaylists.slice(0, 10).map((playlist) => (
                    <button
                      key={playlist.id}
                      type="button"
                      className="flex w-full items-center justify-between px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                      onClick={() => addPlaylist(playlist)}
                      disabled={isPending}
                    >
                      <span className="truncate font-medium">
                        {playlist.name}
                      </span>
                      <div className="ml-2 flex flex-shrink-0 items-center gap-1 text-slate-400">
                        <span className="text-xs">
                          {playlist.droplets?.length ?? 0} droplets
                        </span>
                        <PlusIcon className="h-4 w-4 text-[#297496]" />
                      </div>
                    </button>
                  ))
                )}
              </div>
            </>
          )}

          {/* Droplet search */}
          {nodeMode === "droplet" && (
            <>
              <div className="relative">
                <SearchIcon className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  className="pl-9"
                  placeholder="Search published droplets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  disabled={isPending}
                />
              </div>

              <div className="max-h-48 overflow-y-auto rounded-md border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                {availableDroplets.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-slate-500">
                    {searchQuery
                      ? "No droplets found."
                      : "No droplets available."}
                  </p>
                ) : (
                  availableDroplets.slice(0, 10).map((droplet) => (
                    <button
                      key={droplet.id}
                      type="button"
                      className="flex w-full items-center justify-between px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                      onClick={() => addDroplet(droplet)}
                      disabled={isPending}
                    >
                      <span className="truncate font-medium">
                        {droplet.name}
                      </span>
                      <div className="ml-2 flex flex-shrink-0 items-center gap-1 text-slate-400">
                        <DropletIcon className="h-3.5 w-3.5" />
                        <PlusIcon className="h-4 w-4 text-[#297496]" />
                      </div>
                    </button>
                  ))
                )}
              </div>
            </>
          )}

          {/* Placeholder input */}
          {nodeMode === "placeholder" && (
            <div className="flex gap-2">
              <Input
                placeholder="Label for this placeholder droplet (e.g. Introduction)"
                value={placeholderLabel}
                onChange={(e) => setPlaceholderLabel(e.target.value)}
                disabled={isPending}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addPlaceholder();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={addPlaceholder}
                disabled={isPending || !placeholderLabel.trim()}
                className="shrink-0"
              >
                <PlusIcon className="h-4 w-4" />
                Add
              </Button>
            </div>
          )}

          {/* Selected islands list */}
          <div id="tour-node-list">
            {sortedForDisplay.length > 0 ? (
              <div className="space-y-1">
                {sortedForDisplay.map((node) => {
                  const isBranch = !node.isMainPath;
                  const isPlaceholder =
                    node.nodeType === "droplet" && !node.dropletId;

                  return (
                    <div key={node.localId} className={isBranch ? "ml-6" : ""}>
                      <div
                        className={cn(
                          "flex flex-col gap-2 rounded-md border px-3 py-2",
                          isBranch
                            ? "border-l-2 border-dashed border-slate-300 bg-slate-50/60 dark:border-slate-600 dark:bg-slate-800/40"
                            : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800",
                        )}
                      >
                        {/* Top row: badge + name + reorder + remove */}
                        <div className="flex items-center gap-2">
                          {/* Order badge (main path only) */}
                          {!isBranch && (
                            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#297496] text-xs font-bold text-white">
                              {node.orderIndex + 1}
                            </div>
                          )}

                          {/* Branch indicator */}
                          {isBranch && (
                            <div className="h-4 w-4 flex-shrink-0" />
                          )}

                          {/* Node type icon */}
                          <div className="flex-shrink-0 text-slate-400">
                            {node.nodeType === "playlist" ? (
                              <BookOpenIcon className="h-4 w-4" />
                            ) : isPlaceholder ? (
                              <CircleDashedIcon className="h-4 w-4 text-amber-500" />
                            ) : (
                              <DropletIcon className="h-4 w-4 text-sky-500" />
                            )}
                          </div>

                          {/* Name + count */}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {node.name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {isPlaceholder ? (
                                <span className="text-amber-600 dark:text-amber-400">
                                  Placeholder — waiting to be claimed
                                </span>
                              ) : node.nodeType === "droplet" ? (
                                "1 droplet"
                              ) : (
                                <>
                                  {node.dropletCount}{" "}
                                  {node.dropletCount === 1
                                    ? "droplet"
                                    : "droplets"}
                                </>
                              )}
                            </p>
                          </div>

                          {/* Reorder arrows (main path only) */}
                          {!isBranch && (
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => moveUp(node.localId)}
                                disabled={node.orderIndex === 0 || isPending}
                                className="rounded p-0.5 text-slate-400 hover:bg-slate-200 disabled:opacity-30 dark:hover:bg-slate-700"
                                aria-label="Move up"
                              >
                                <ChevronUpIcon className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveDown(node.localId)}
                                disabled={
                                  node.orderIndex ===
                                    mainPathNodes.length - 1 || isPending
                                }
                                className="rounded p-0.5 text-slate-400 hover:bg-slate-200 disabled:opacity-30 dark:hover:bg-slate-700"
                                aria-label="Move down"
                              >
                                <ChevronDownIcon className="h-4 w-4" />
                              </button>
                            </div>
                          )}

                          {/* Remove button */}
                          <button
                            type="button"
                            onClick={() => removeNode(node.localId)}
                            disabled={isPending}
                            className="rounded p-0.5 text-slate-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30"
                            aria-label="Remove island"
                          >
                            <XIcon className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Bottom row: branch controls */}
                        <div className="flex flex-col gap-2">
                          {/* "Branches from" select */}
                          <div className="flex items-center gap-1.5">
                            <label className="shrink-0 text-xs text-slate-500">
                              Branches from
                            </label>
                            <select
                              value={node.parentLocalId ?? ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setParent(
                                  node.localId,
                                  val === "" ? null : val,
                                );
                              }}
                              disabled={isPending}
                              className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:ring-1 focus:ring-slate-400 focus:outline-none disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                            >
                              <option value="">None (main path)</option>
                              {mainPathNodes
                                .filter((m) => m.localId !== node.localId)
                                .sort((a, b) => a.orderIndex - b.orderIndex)
                                .map((m) => (
                                  <option key={m.localId} value={m.localId}>
                                    {m.orderIndex + 1}. {m.name}
                                  </option>
                                ))}
                            </select>
                          </div>

                          {/* "Type" toggle (branch nodes only) */}
                          {isBranch && (
                            <div className="flex items-center gap-1.5">
                              <label className="text-xs text-slate-500">
                                Type
                              </label>
                              <div className="flex overflow-hidden rounded border border-slate-200 dark:border-slate-600">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setBranchType(node.localId, "required")
                                  }
                                  disabled={isPending}
                                  className={cn(
                                    "px-2 py-0.5 text-xs font-medium transition-colors",
                                    node.branchType === "required"
                                      ? "bg-blue-600 text-white"
                                      : "bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800",
                                  )}
                                >
                                  Required
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setBranchType(node.localId, "optional")
                                  }
                                  disabled={isPending}
                                  className={cn(
                                    "px-2 py-0.5 text-xs font-medium transition-colors",
                                    node.branchType === "optional"
                                      ? "bg-yellow-500 text-white"
                                      : "bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800",
                                  )}
                                >
                                  Optional
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-400 dark:text-slate-500">
                {nodeMode === "placeholder"
                  ? "Enter a label above and click Add to create a placeholder droplet for someone to claim."
                  : "Search above to add islands."}
              </p>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </p>
        )}

        {/* Sequential progression toggle */}
        <label
          id="tour-sequential-toggle"
          className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 dark:border-slate-700"
        >
          <input
            type="checkbox"
            checked={isSequential}
            onChange={(e) => setIsSequential(e.target.checked)}
            disabled={isPending}
            className="h-4 w-4 rounded border-slate-300 text-[#297496] focus:ring-[#297496]"
          />
          <div>
            <span className="text-sm font-medium text-slate-900 dark:text-white">
              Sequential progression
            </span>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Lock islands until the previous one is completed
            </p>
          </div>
        </label>

        {/* Action buttons */}
        <div id="tour-publish-buttons" className="flex gap-3">
          <Button
            type="button"
            onClick={() => handleSubmit("published")}
            disabled={isPending}
            className="flex-1 bg-[#297496] hover:bg-[#225f7a]"
          >
            {isPending && isEditing && "Updating..."}
            {isPending && !isEditing && "Publishing..."}
            {!isPending && isEditing && "Update & Publish"}
            {!isPending && !isEditing && "Publish Voyage"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleSubmit("draft")}
            disabled={isPending}
            className="flex-1 border-[#297496] text-[#297496] hover:bg-[#297496]/10"
          >
            {isPending && "Saving..."}
            {!isPending && isEditing && "Save Changes"}
            {!isPending && !isEditing && "Save as Draft"}
          </Button>
        </div>
      </div>

      {/* Right: Live tree preview */}
      <div id="tour-preview" className="w-full lg:w-1/2">
        <div className="sticky top-8">
          <h3 className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-300">
            Live Preview
          </h3>
          <VoyageTreeMap nodes={treeNodes} />
        </div>
      </div>
    </div>
  );
}
