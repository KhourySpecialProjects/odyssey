"use client";

import { useState, useTransition, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Playlist } from "@/types";
import { createVoyageWithNodes } from "@/lib/requests/voyage";
import { VoyageTreeMap, TreeNode } from "@/components/voyages/voyage-tree-map";
import {
  ChevronUpIcon,
  ChevronDownIcon,
  XIcon,
  SearchIcon,
  PlusIcon,
} from "lucide-react";

interface SelectedNode {
  playlistId: number;
  name: string;
  slug: string;
  dropletCount: number;
  isMainPath: boolean;
  branchType: "required" | "optional";
  parentPlaylistId: number | null; // null = main path
  orderIndex: number;
}

interface VoyageFormProps {
  playlists: Playlist[];
  authorId: number;
}

export function VoyageForm({ playlists, authorId }: VoyageFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNodes, setSelectedNodes] = useState<SelectedNode[]>([]);
  const [error, setError] = useState("");

  const availablePlaylists = useMemo(
    () =>
      playlists.filter(
        (p) =>
          !selectedNodes.some((n) => n.playlistId === p.id) &&
          p.name.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [playlists, selectedNodes, searchQuery],
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
          playlistId: playlist.id,
          name: playlist.name,
          slug: playlist.slug,
          dropletCount,
          isMainPath: true,
          branchType: "required",
          parentPlaylistId: null,
          orderIndex: mainCount,
        },
      ];
    });
    setSearchQuery("");
  }, []);

  const removeNode = useCallback((playlistId: number) => {
    setSelectedNodes((prev) => {
      // When removing a node, also remove any branch nodes that depend on it
      const filtered = prev.filter(
        (n) => n.playlistId !== playlistId && n.parentPlaylistId !== playlistId,
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

  const moveUp = useCallback((playlistId: number) => {
    setSelectedNodes((prev) => {
      const mainNodes = prev
        .filter((n) => n.isMainPath)
        .sort((a, b) => a.orderIndex - b.orderIndex);
      const idx = mainNodes.findIndex((n) => n.playlistId === playlistId);
      if (idx <= 0) return prev;

      // Swap orderIndex values
      const idA = mainNodes[idx - 1].playlistId;
      const idB = mainNodes[idx].playlistId;
      return prev.map((n) => {
        if (n.playlistId === idA) return { ...n, orderIndex: idx };
        if (n.playlistId === idB) return { ...n, orderIndex: idx - 1 };
        return n;
      });
    });
  }, []);

  const moveDown = useCallback((playlistId: number) => {
    setSelectedNodes((prev) => {
      const mainNodes = prev
        .filter((n) => n.isMainPath)
        .sort((a, b) => a.orderIndex - b.orderIndex);
      const idx = mainNodes.findIndex((n) => n.playlistId === playlistId);
      if (idx < 0 || idx >= mainNodes.length - 1) return prev;

      const idA = mainNodes[idx].playlistId;
      const idB = mainNodes[idx + 1].playlistId;
      return prev.map((n) => {
        if (n.playlistId === idA) return { ...n, orderIndex: idx + 1 };
        if (n.playlistId === idB) return { ...n, orderIndex: idx };
        return n;
      });
    });
  }, []);

  const setParent = useCallback(
    (playlistId: number, parentId: number | null) => {
      setSelectedNodes((prev) => {
        // Recompute main-path orderIndex after structure change
        const updated = prev.map((n) => {
          if (n.playlistId !== playlistId) return n;
          if (parentId === null) {
            // Promoting to main path
            const mainCount = prev.filter((p) => p.isMainPath).length;
            return {
              ...n,
              isMainPath: true,
              parentPlaylistId: null,
              orderIndex: mainCount,
            };
          }
          return {
            ...n,
            isMainPath: false,
            parentPlaylistId: parentId,
            orderIndex: 0, // branch order = add order, reset here
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
    (playlistId: number, branchType: "required" | "optional") => {
      setSelectedNodes((prev) =>
        prev.map((n) =>
          n.playlistId === playlistId ? { ...n, branchType } : n,
        ),
      );
    },
    [],
  );

  // Derive TreeNode[] for VoyageTreeMap preview
  const treeNodes: TreeNode[] = useMemo(
    () =>
      selectedNodes.map((node) => ({
        id: node.playlistId,
        label: node.name,
        slug: node.slug,
        dropletCount: node.dropletCount,
        isMainPath: node.isMainPath,
        branchType: node.branchType,
        parentId: node.parentPlaylistId,
        orderIndex: node.orderIndex,
        status: "available",
      })),
    [selectedNodes],
  );

  // Sort for display: main-path nodes first (by orderIndex), then branch nodes grouped under parent
  const sortedForDisplay = useMemo(() => {
    const mainSorted = selectedNodes
      .filter((n) => n.isMainPath)
      .sort((a, b) => a.orderIndex - b.orderIndex);

    const result: SelectedNode[] = [];
    for (const main of mainSorted) {
      result.push(main);
      const branches = selectedNodes.filter(
        (n) => !n.isMainPath && n.parentPlaylistId === main.playlistId,
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
      setError("At least one island (playlist) is required.");
      return;
    }

    startTransition(async () => {
      const result = await createVoyageWithNodes({
        name: name.trim(),
        description: description.trim() || undefined,
        status,
        nodes: selectedNodes.map((n) => ({
          playlistId: n.playlistId,
          isMainPath: n.isMainPath,
          branchType: n.branchType,
          parentPlaylistId: n.parentPlaylistId,
          orderIndex: n.orderIndex,
          label: n.name,
        })),
        authorId,
      });

      if (!result.ok) {
        setError(result.error || "Failed to create voyage.");
        return;
      }

      router.push("/admin/voyages");
    });
  }

  return (
    <div className="flex w-full flex-col gap-8 lg:flex-row">
      {/* Left: Form panel */}
      <div className="flex w-full flex-col gap-6 lg:w-1/2">
        {/* Name */}
        <div className="flex flex-col gap-2">
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

        {/* Playlist picker */}
        <div className="flex flex-col gap-3">
          <Label>Islands (Playlists)</Label>

          {/* Search input */}
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

          {/* Search results */}
          {searchQuery.length > 0 && (
            <div className="max-h-48 overflow-y-auto rounded-md border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
              {availablePlaylists.length === 0 ? (
                <p className="px-4 py-3 text-sm text-slate-500">
                  No playlists found.
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
                      <PlusIcon className="h-4 w-4 text-green-600" />
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Selected islands list */}
          {sortedForDisplay.length > 0 ? (
            <div className="space-y-1">
              {sortedForDisplay.map((node) => {
                const isBranch = !node.isMainPath;

                return (
                  <div key={node.playlistId} className={isBranch ? "ml-6" : ""}>
                    <div
                      className={[
                        "flex flex-col gap-2 rounded-md border px-3 py-2",
                        isBranch
                          ? "border-l-2 border-dashed border-slate-300 bg-slate-50/60 dark:border-slate-600 dark:bg-slate-800/40"
                          : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800",
                      ].join(" ")}
                    >
                      {/* Top row: badge + name + reorder + remove */}
                      <div className="flex items-center gap-2">
                        {/* Order badge (main path only) */}
                        {!isBranch && (
                          <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-green-700 text-xs font-bold text-white">
                            {node.orderIndex + 1}
                          </div>
                        )}

                        {/* Branch indicator */}
                        {isBranch && <div className="h-4 w-4 flex-shrink-0" />}

                        {/* Name + count */}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {node.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {node.dropletCount}{" "}
                            {node.dropletCount === 1 ? "droplet" : "droplets"}
                          </p>
                        </div>

                        {/* Reorder arrows (main path only) */}
                        {!isBranch && (
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => moveUp(node.playlistId)}
                              disabled={node.orderIndex === 0 || isPending}
                              className="rounded p-0.5 text-slate-400 hover:bg-slate-200 disabled:opacity-30 dark:hover:bg-slate-700"
                              aria-label="Move up"
                            >
                              <ChevronUpIcon className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveDown(node.playlistId)}
                              disabled={
                                node.orderIndex === mainPathNodes.length - 1 ||
                                isPending
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
                          onClick={() => removeNode(node.playlistId)}
                          disabled={isPending}
                          className="rounded p-0.5 text-slate-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30"
                          aria-label="Remove island"
                        >
                          <XIcon className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Bottom row: branch controls */}
                      <div className="flex flex-wrap items-center gap-3">
                        {/* "Branches from" select */}
                        <div className="flex items-center gap-1.5">
                          <label className="text-xs text-slate-500">
                            Branches from
                          </label>
                          <select
                            value={node.parentPlaylistId ?? ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setParent(
                                node.playlistId,
                                val === "" ? null : Number(val),
                              );
                            }}
                            disabled={isPending}
                            className="rounded border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-700 focus:ring-1 focus:ring-slate-400 focus:outline-none disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                          >
                            <option value="">None (main path)</option>
                            {mainPathNodes
                              .filter((m) => m.playlistId !== node.playlistId)
                              .sort((a, b) => a.orderIndex - b.orderIndex)
                              .map((m) => (
                                <option key={m.playlistId} value={m.playlistId}>
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
                                  setBranchType(node.playlistId, "required")
                                }
                                disabled={isPending}
                                className={[
                                  "px-2 py-0.5 text-xs font-medium transition-colors",
                                  node.branchType === "required"
                                    ? "bg-blue-600 text-white"
                                    : "bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800",
                                ].join(" ")}
                              >
                                Required
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setBranchType(node.playlistId, "optional")
                                }
                                disabled={isPending}
                                className={[
                                  "px-2 py-0.5 text-xs font-medium transition-colors",
                                  node.branchType === "optional"
                                    ? "bg-yellow-500 text-white"
                                    : "bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800",
                                ].join(" ")}
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
              Search above to add playlists as islands.
            </p>
          )}
        </div>

        {/* Error */}
        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </p>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <Button
            type="button"
            onClick={() => handleSubmit("published")}
            disabled={isPending}
            className="flex-1"
          >
            {isPending ? "Publishing..." : "Publish Voyage"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleSubmit("draft")}
            disabled={isPending}
            className="flex-1"
          >
            {isPending ? "Saving..." : "Save as Draft"}
          </Button>
        </div>
      </div>

      {/* Right: Live tree preview */}
      <div className="w-full lg:w-1/2">
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
