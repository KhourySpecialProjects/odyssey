"use client";

import { Playlist } from "@/types";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { XCircleIcon, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRef } from "react";
import React from "react";
import { Badge } from "@/components/ui/badge";
import { uppercaseFirstChar } from "@/lib/utils";

function useCombinedRefs<T>(
  ...refs: (React.Ref<T> | ((instance: T | null) => void))[]
): React.RefObject<T> {
  const targetRef = useRef<T>(null);

  React.useEffect(() => {
    refs.forEach((ref) => {
      if (!ref) return;

      if (typeof ref === "function") {
        ref(targetRef.current);
      } else {
        (ref as React.MutableRefObject<T>).current = targetRef.current as T;
      }
    });
  }, [refs]);

  return targetRef;
}

interface PlaylistItemProps {
  playlist: Playlist;
  index: number;
  movePlaylist: (dragIndex: number, hoverIndex: number) => void;
  onRemove: (playlistId: number) => void;
}

const PlaylistItem = ({
  playlist,
  index,
  movePlaylist,
  onRemove,
}: PlaylistItemProps) => {
  const [{ isDragging }, drag] = useDrag({
    type: "playlist",
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: "playlist",
    hover: (item: { index: number }) => {
      if (item.index !== index) {
        movePlaylist(item.index, index);
        item.index = index;
      }
    },
  });

  const combinedRef = useCombinedRefs<HTMLDivElement>(drag, drop);

  return (
    <div
      ref={combinedRef}
      className={`group relative rounded-md border border-slate-200 bg-slate-50 transition-colors hover:border-slate-300 dark:border-slate-500 dark:bg-slate-800 ${
        isDragging ? "opacity-50 shadow-lg" : ""
      }`}
    >
      <div className="flex items-center p-4">
        <div {...drag} className="mr-4 cursor-grab active:cursor-grabbing">
          <GripVertical className="h-5 w-5 shrink-0 text-slate-400" />
        </div>

        <div className="flex-grow">
          <div className="mb-2 flex flex-0 flex-row flex-wrap gap-1.5">
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
          className="text-slate-400 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-500"
        >
          <XCircleIcon className="h-5 w-5" />
        </Button>
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
  const movePlaylist = (dragIndex: number, hoverIndex: number) => {
    const reorderedPlaylists = [...playlists];
    const [draggedItem] = reorderedPlaylists.splice(dragIndex, 1);
    reorderedPlaylists.splice(hoverIndex, 0, draggedItem);
    onReorder(reorderedPlaylists);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-2">
        {playlists.map((playlist, index) => (
          <PlaylistItem
            key={playlist.id}
            playlist={playlist}
            index={index}
            movePlaylist={movePlaylist}
            onRemove={onRemove}
          />
        ))}
      </div>
    </DndProvider>
  );
}
