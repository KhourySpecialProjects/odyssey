"use client";

import { Playlist } from "@/types";
import { XCircleIcon, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import React from "react";
import { Badge } from "@/components/ui/badge";
import { uppercaseFirstChar, cn } from "@/lib/utils";

interface PlaylistItemProps {
  playlist: Playlist;
  index: number;
  totalPlaylists: number;
  movePlaylistUp: (index: number) => void;
  movePlaylistDown: (index: number) => void;
  onRemove: (playlistId: number) => void;
}

const PlaylistItem = ({
  playlist,
  index,
  totalPlaylists,
  movePlaylistUp,
  movePlaylistDown,
  onRemove,
}: PlaylistItemProps) => {
  return (
    <div className="relative flex items-start gap-3">
      {/* Arrow controls on the left */}
      <div className="flex flex-col gap-1 pt-4">
        <button
          onClick={() => movePlaylistUp(index)}
          disabled={index === 0}
          className={cn(
            "rounded-md border border-slate-300 bg-white p-1.5 text-slate-600 transition-colors hover:bg-slate-100 hover:shadow-md dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700",
            index === 0 && "cursor-not-allowed opacity-30",
          )}
          aria-label="Move block up"
          title="Move block up"
        >
          <ChevronUp className="h-4 w-4" />
        </button>
        <button
          onClick={() => movePlaylistDown(index)}
          disabled={index === totalPlaylists - 1}
          className={cn(
            "rounded-md border border-slate-300 bg-white p-1.5 text-slate-600 transition-colors hover:bg-slate-100 hover:shadow-md dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700",
            index === totalPlaylists - 1 && "cursor-not-allowed opacity-30",
          )}
          aria-label="Move block down"
          title="Move block down"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      {/* Playlist content */}
      <div className="group relative flex-1 rounded-md border border-slate-200 bg-slate-50 transition-colors hover:border-slate-300 dark:border-slate-500 dark:bg-slate-800">
        <div className="flex items-center p-4">
          <div className="flex-grow">
            <div className="flex-0 mb-2 flex flex-row flex-wrap gap-1.5">
              <Badge variant="default" className="dark:bg-slate-700">
                {playlist.isPublic ? "Public" : "Private"}
              </Badge>
              <Badge variant="default" className="dark:bg-slate-700">
                {uppercaseFirstChar(playlist.duration || "medium")}
              </Badge>
            </div>

            <span className="block text-xl font-bold text-slate-950 dark:text-slate-300">
              {playlist.name}
            </span>

            {playlist.droplets && (
              <p className="text-muted-foreground mt-1 text-sm">
                {playlist.droplets.length} droplets
              </p>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(playlist.id)}
            className="text-slate-400 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
          >
            <XCircleIcon className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

interface PlaylistListProps {
  playlists: Playlist[];
  onReorder: (reorderedPlaylists: Playlist[]) => void;
  onRemove: (playlistId: number) => void;
}

export function PlaylistList({
  playlists,
  onReorder,
  onRemove,
}: PlaylistListProps) {
  const movePlaylistUp = (index: number) => {
    if (index === 0) return;
    const reorderedPlaylists = [...playlists];
    [reorderedPlaylists[index - 1], reorderedPlaylists[index]] = [
      reorderedPlaylists[index],
      reorderedPlaylists[index - 1],
    ];
    onReorder(reorderedPlaylists);
  };

  const movePlaylistDown = (index: number) => {
    if (index === playlists.length - 1) return;
    const reorderedPlaylists = [...playlists];
    [reorderedPlaylists[index], reorderedPlaylists[index + 1]] = [
      reorderedPlaylists[index + 1],
      reorderedPlaylists[index],
    ];
    onReorder(reorderedPlaylists);
  };

  return (
    <div className="space-y-2">
      {playlists.map((playlist, index) => (
        <PlaylistItem
          key={playlist.id}
          playlist={playlist}
          index={index}
          totalPlaylists={playlists.length}
          movePlaylistUp={movePlaylistUp}
          movePlaylistDown={movePlaylistDown}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}
