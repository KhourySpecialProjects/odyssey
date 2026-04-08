"use client";

import { useState, useTransition, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Playlist } from "@/types";
import { createVoyage } from "@/lib/requests/voyage";
import { VoyageMap } from "@/components/voyages/voyage-map";
import {
  ChevronUpIcon,
  ChevronDownIcon,
  XIcon,
  SearchIcon,
  PlusIcon,
} from "lucide-react";

interface SelectedPlaylist {
  id: number;
  name: string;
  slug: string;
  dropletCount: number;
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
  const [selectedPlaylists, setSelectedPlaylists] = useState<
    SelectedPlaylist[]
  >([]);
  const [error, setError] = useState("");

  const availablePlaylists = useMemo(
    () =>
      playlists.filter(
        (p) =>
          !selectedPlaylists.some((sp) => sp.id === p.id) &&
          p.name.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [playlists, selectedPlaylists, searchQuery],
  );

  const addPlaylist = useCallback((playlist: Playlist) => {
    const dropletCount = playlist.droplets?.length ?? 0;
    setSelectedPlaylists((prev) => [
      ...prev,
      {
        id: playlist.id,
        name: playlist.name,
        slug: playlist.slug,
        dropletCount,
        orderIndex: prev.length,
      },
    ]);
    setSearchQuery("");
  }, []);

  const removePlaylist = useCallback((id: number) => {
    setSelectedPlaylists((prev) =>
      prev.filter((p) => p.id !== id).map((p, i) => ({ ...p, orderIndex: i })),
    );
  }, []);

  const moveUp = useCallback((index: number) => {
    if (index === 0) return;
    setSelectedPlaylists((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next.map((p, i) => ({ ...p, orderIndex: i }));
    });
  }, []);

  const moveDown = useCallback((index: number) => {
    setSelectedPlaylists((prev) => {
      if (index === prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next.map((p, i) => ({ ...p, orderIndex: i }));
    });
  }, []);

  function handleSubmit(status: "draft" | "published") {
    setError("");

    if (!name.trim()) {
      setError("Voyage name is required.");
      return;
    }

    if (selectedPlaylists.length === 0) {
      setError("At least one island (playlist) is required.");
      return;
    }

    startTransition(async () => {
      const result = await createVoyage({
        name: name.trim(),
        description: description.trim() || undefined,
        status,
        playlists: selectedPlaylists.map((p) => ({
          id: p.id,
          orderIndex: p.orderIndex,
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
          {selectedPlaylists.length > 0 ? (
            <div className="space-y-2">
              {selectedPlaylists.map((playlist, index) => (
                <div
                  key={playlist.id}
                  className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
                >
                  {/* Order badge */}
                  <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-green-700 text-xs font-bold text-white">
                    {index + 1}
                  </div>

                  {/* Name + count */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {playlist.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {playlist.dropletCount}{" "}
                      {playlist.dropletCount === 1 ? "droplet" : "droplets"}
                    </p>
                  </div>

                  {/* Up/down buttons */}
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => moveUp(index)}
                      disabled={index === 0 || isPending}
                      className="rounded p-0.5 text-slate-400 hover:bg-slate-200 disabled:opacity-30 dark:hover:bg-slate-700"
                      aria-label="Move up"
                    >
                      <ChevronUpIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveDown(index)}
                      disabled={
                        index === selectedPlaylists.length - 1 || isPending
                      }
                      className="rounded p-0.5 text-slate-400 hover:bg-slate-200 disabled:opacity-30 dark:hover:bg-slate-700"
                      aria-label="Move down"
                    >
                      <ChevronDownIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removePlaylist(playlist.id)}
                      disabled={isPending}
                      className="rounded p-0.5 text-slate-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30"
                      aria-label="Remove island"
                    >
                      <XIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
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

      {/* Right: Live map preview */}
      <div className="w-full lg:w-1/2">
        <div className="sticky top-8">
          <h3 className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-300">
            Live Preview
          </h3>
          <VoyageMap playlists={selectedPlaylists} showOceanBackground />
        </div>
      </div>
    </div>
  );
}
