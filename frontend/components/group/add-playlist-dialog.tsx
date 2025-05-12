"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PlusCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { Playlist } from "@/types";
import { getPlaylists } from "@/lib/requests/playlist";
import { Badge } from "../ui/badge";
import { uppercaseFirstChar } from "@/lib/utils";
import Link from "next/link";

interface AddPlaylistDialogProps {
  currentPlaylists: Playlist[];
  onAddPlaylists: (playlists: Playlist[]) => void;
}

export function AddPlaylistDialog({
  currentPlaylists,
  onAddPlaylists,
}: AddPlaylistDialogProps) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [availablePlaylists, setAvailablePlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylists, setSelectedPlaylists] = useState<Playlist[]>([]);

  useEffect(() => {
    if (open) {
      getPlaylists().then((playlists) => {
        const filtered = playlists.filter(
          (p) => !currentPlaylists.find((cp) => cp.id === p.id),
        );
        setAvailablePlaylists(filtered);
      });
    }
  }, [open, currentPlaylists]);

  const filteredPlaylists = availablePlaylists
    .filter((playlist) =>
      playlist.name.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) => a.name?.localeCompare(b.name));

  const handleAddPlaylist = (playlist: Playlist) => {
    setSelectedPlaylists((prev) => [...prev, playlist]);
    setAvailablePlaylists((prev) => prev.filter((p) => p.id !== playlist.id));
  };

  const handleDone = () => {
    onAddPlaylists(selectedPlaylists);
    setSelectedPlaylists([]);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Playlist
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Add Playlists to Group</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            placeholder="Search playlists..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full"
          />
          <div className="flex max-h-[60vh] flex-col gap-6 overflow-y-auto">
            {filteredPlaylists.map((playlist) => (
              <div key={playlist.id} className="group relative h-[120px]">
                <Link
                  key={playlist.id}
                  href={`/p/${playlist.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <div className="h-full rounded-md border bg-slate-50 p-4 dark:border-slate-500 dark:bg-slate-800">
                    <div className="flex h-full flex-col">
                      <span className="text-xl font-bold dark:text-slate-300">
                        {playlist.name}
                      </span>
                      <div className="mt-2 flex gap-2">
                        <Badge variant="outline">
                          {playlist.isPublic ? "Public" : "Private"}
                        </Badge>
                        {playlist.duration && (
                          <Badge variant="outline">
                            {uppercaseFirstChar(playlist.duration)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
                <Button
                  variant="ghost"
                  size="lg"
                  className="absolute top-1/2 right-4 -translate-y-1/2"
                  onClick={() => handleAddPlaylist(playlist)}
                  data-testid="addPlaylist"
                >
                  <PlusCircle className="h-6 w-6 text-green-700" />
                </Button>
              </div>
            ))}
          </div>
          <div className="flex justify-end border-t pt-4">
            <Button
              onClick={handleDone}
              disabled={selectedPlaylists.length === 0}
            >
              Add {selectedPlaylists.length} Playlist
              {selectedPlaylists.length !== 1 ? "s" : ""}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
