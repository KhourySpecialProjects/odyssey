"use client";

import { useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { SearchBar } from "@/components/admin/search-bar";
import DraggableTileList from "@/components/droplets/draggable_tile_list";
import { createPlaylistAnnouncement } from "@/lib/requests/feed";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { AuthorizedUser, Droplet } from "@/types";
import { createPlaylist, updatePlaylist } from "@/lib/requests/playlist";

interface PlaylistFormProps {
  droplets: Droplet[];
  author: AuthorizedUser;
  userId: number;
  existingPlaylist?: {
    id: number;
    name: string;
    description?: string;
    slug: string;
    isPublic: boolean;
    droplets?: Droplet[];
  };
}

export function PlaylistForm({
  droplets,
  author,
  userId,
  existingPlaylist,
}: PlaylistFormProps) {
  const router = useRouter();
  const [name, setName] = useState(existingPlaylist?.name || "");
  const [description, setDescription] = useState(
    existingPlaylist?.description || "",
  );
  const [isPublic, setIsPublic] = useState(existingPlaylist?.isPublic || false);
  const [selectedDroplets, setSelectedDroplets] = useState(
    existingPlaylist?.droplets || [],
  );
  const [slug] = useState(existingPlaylist?.slug || "");
  const [error, setError] = useState("");
  const [sourceDroplets, setSourceDroplets] = useState(() => {
    if (existingPlaylist?.droplets) {
      return droplets.filter(
        (d) => !existingPlaylist.droplets?.some((pd) => pd.id === d.id),
      );
    }
    return droplets;
  });

  const handleMoveUp = useCallback((index: number) => {
    if (index === 0) return;
    setSelectedDroplets((prev) => {
      const reordered = [...prev];
      [reordered[index - 1], reordered[index]] = [
        reordered[index],
        reordered[index - 1],
      ];
      return reordered;
    });
  }, []);

  const handleMoveDown = useCallback((index: number) => {
    setSelectedDroplets((prev) => {
      if (index === prev.length - 1) return prev;
      const reordered = [...prev];
      [reordered[index], reordered[index + 1]] = [
        reordered[index + 1],
        reordered[index],
      ];
      return reordered;
    });
  }, []);

  const totalLessons = selectedDroplets.reduce(
    (sum, droplet) => sum + (droplet.lessons?.length || 0),
    0,
  );

  const handlePlaylistPost = async () => {
    const playlist = existingPlaylist ?? createdPlaylist;
    if (!playlist) return;
    try {
      await createPlaylistAnnouncement(playlist.name, playlist.id);
      router.push("/my-content");
    } catch (error) {
      console.error("Failed to make playlist announcement: ", error);
      setError("Failed to post announcement. Please try again.");
    }
  };

  const [createdPlaylist, setCreatedPlaylist] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const searchParams = useSearchParams();
  const [tempQuery, setTempQuery] = useState(searchParams.get("q") || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || name === "") {
      setError("Please enter a playlist name");
      return;
    }
    if (selectedDroplets.length === 0) {
      setError("Please select at least one droplet");
      return;
    }
    const updatePlaylistData = {
      name,
      description,
      isPublic,
      droplets: selectedDroplets.map((droplet) => ({ id: droplet.id })),
      author: { id: author.id },
      userId,
      slug,
    };
    const playlistData = {
      name,
      description,
      isPublic,
      droplets: selectedDroplets.map((droplet) => ({ id: droplet.id })),
      author: { id: author.id },
      userId,
    };

    try {
      let response;
      if (existingPlaylist) {
        response = await updatePlaylist(
          existingPlaylist.id,
          updatePlaylistData,
        );
      } else {
        response = await createPlaylist(playlistData);
      }

      if (response.ok) {
        if (!existingPlaylist && response.data) {
          setCreatedPlaylist({ id: response.data.id, name: name });
        }
        setIsOpen(true);
      } else {
        setError(response.error || "Failed to save Playlist!");
      }
    } catch (error) {
      console.error("Error saving playlist:", error);
      setError("An unexpected error occurred");
    }
  };

  const handleAddDroplet = useCallback((droplet: Droplet) => {
    setSourceDroplets((prev) => prev.filter((d) => d.id !== droplet.id));
    setSelectedDroplets((prev) => [...prev, droplet]);
  }, []);

  const handleRemoveDroplet = useCallback((droplet: Droplet) => {
    setSelectedDroplets((prev) => prev.filter((d) => d.id !== droplet.id));
    setSourceDroplets((prev) => [...prev, droplet]);
  }, []);

  const filteredDroplets = sourceDroplets.filter((droplet) =>
    droplet.name.toLowerCase().includes(tempQuery.toLowerCase()),
  );

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex h-min w-full flex-col space-y-8"
      role="form"
    >
      <div className="flex flex-col gap-8 lg:flex-row">
        <div className="lg:w-1/2">
          <Label
            htmlFor="name"
            className="py-0.5 pb-2 text-xl font-bold text-slate-900 dark:text-white"
          >
            Playlist Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter playlist name"
            required
            className="w-full border-[#D0D5DD] dark:border-slate-700"
          />
        </div>

        <div className="lg:w-1/2">
          <Label
            htmlFor="description"
            className="py-0.5 pb-2 text-xl font-bold text-slate-900 dark:text-white"
          >
            Description
          </Label>
          <Input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter playlist description"
            className="w-full border-[#D0D5DD] dark:border-slate-700"
          />
        </div>
      </div>

      <div>
        <div className="pb-2 text-xl font-bold text-slate-900 dark:text-white">
          Select and Arrange Droplets <span className="text-red-500">*</span>
        </div>
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
          {selectedDroplets.length} droplets selected ({totalLessons} lessons
          total)
        </p>

        <div className="grid grid-cols-2 gap-2 md:gap-8">
          <div className="flex flex-col gap-2">
            <SearchBar
              placeholder="Search Droplets..."
              value={tempQuery}
              onChange={(e) => setTempQuery(e.target.value)}
              className="w-full"
              inputClassName="h-9 text-sm bg-white dark:bg-slate-800"
              iconClassName="h-4 w-4"
            />
            <DraggableTileList
              droplets={filteredDroplets}
              onAction={handleAddDroplet}
              actionType="add"
              title="Available Droplets"
            />
          </div>
          <div className="flex flex-col gap-2">
            <div className="h-9" />
            <DraggableTileList
              droplets={selectedDroplets}
              onAction={handleRemoveDroplet}
              actionType="remove"
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
              title="Selected Droplets"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Switch
            id="public"
            checked={isPublic}
            onCheckedChange={setIsPublic}
          />
          <Label
            htmlFor="public"
            className="text-sm text-slate-700 dark:text-slate-300"
          >
            Make this playlist public
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="outline"
            type="button"
            onClick={() => router.push("/my-content")}
            className="border-[#D0D5DD] text-[#344054] hover:border-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            type="submit"
            className="bg-[#287697] text-white hover:bg-[#1f6080]"
          >
            {existingPlaylist ? "Save Playlist" : "Create Playlist"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="w-full rounded-md border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
          <p className="text-sm font-medium text-red-800 dark:text-red-200">
            {error}
          </p>
        </div>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[825px]">
          <DialogHeader>
            <DialogTitle className="dark:text-slate-300">
              Would you like to announce these changes to everyone enrolled in
              this playlist?
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4 flex flex-col gap-4">
            <Button
              className="bg-[#287697] text-white hover:bg-[#1f6080]"
              onClick={handlePlaylistPost}
            >
              Share
            </Button>
            <Button
              variant="outline"
              className="border-[#D0D5DD] text-[#344054] hover:border-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
              onClick={() => {
                setIsOpen(false);
                router.push("/my-content");
              }}
            >
              Not Now
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </form>
  );
}
