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

function useCombinedRefs(...refs: any[]) {
  const targetRef = useRef(null);

  React.useEffect(() => {
    refs.forEach((ref) => {
      if (!ref) return;

      if (typeof ref === "function") {
        ref(targetRef.current);
      } else {
        ref.current = targetRef.current;
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

  const combinedRef = useCombinedRefs(drag, drop);

  return (
    <div
      ref={combinedRef}
      className={`relative group transition-colors border rounded-md border-slate-200 hover:border-slate-300 bg-slate-50 ${
        isDragging ? "opacity-50 shadow-lg" : ""
      }`}
    >
      <div className="flex items-center p-4">
        <div {...drag} className="cursor-grab active:cursor-grabbing mr-4">
          <GripVertical className="w-5 h-5 text-slate-400 shrink-0" />
        </div>

        <div className="flex-grow">
          <div className="flex flex-row flex-wrap flex-0 gap-1.5 mb-2">
            <Badge variant="outline">
              {playlist.isPublic ? "Public" : "Private"}
            </Badge>
            <Badge variant="outline">
              {uppercaseFirstChar(playlist.duration || "medium")}
            </Badge>
          </div>

          <span className="block text-xl font-bold text-slate-950">
            {playlist.name}
          </span>

          {playlist.droplets && (
            <p className="text-sm text-muted-foreground mt-1">
              {playlist.droplets.length} droplets
            </p>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRemove(playlist.id)}
          className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
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
