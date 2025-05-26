"use client";

import { useState, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { MoveLeftIcon, SearchIcon } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import DraggableTileList from "@/components/droplets/draggable_tile_list";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { createPlaylist } from "@/lib/actions";
import { updatePlaylist } from "@/lib/actions";
import { createPlaylistAnnouncement } from "@/lib/requests/feed";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { AuthorizedUser, Droplet } from "@/types";

interface PlaylistFormProps {
  droplets: Droplet[];
  author: AuthorizedUser;
  userId: number;
  existingPlaylist?: {
    id: number;
    name: string;
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

  const totalLessons = selectedDroplets.reduce(
    (sum, droplet) => sum + (droplet.lessons?.length || 0),
    0,
  );

  const handlePlaylistPost = async () => {
    try {
      if (existingPlaylist) {
        await createPlaylistAnnouncement(
          existingPlaylist.name,
          existingPlaylist?.id,
        );
        router.push("/my-content");
      }
    } catch (error) {
      console.error("Failed to make playlist announcement: ", error);
    }
  };

  const handleDropToSelected = useCallback((droplet: Droplet) => {
    setSourceDroplets((current) => current.filter((d) => d.id !== droplet.id));
    setSelectedDroplets((current) => [...current, droplet]);
  }, []);

  const handleDropToSource = useCallback((droplet: Droplet) => {
    setSelectedDroplets((current) =>
      current.filter((d) => d.id !== droplet.id),
    );
    setSourceDroplets((current) => [...current, droplet]);
  }, []);

  const handleReorderSelected = (fromIndex: number, toIndex: number) => {
    setSelectedDroplets((current) => {
      const newItems = [...current];
      const [removed] = newItems.splice(fromIndex, 1);
      newItems.splice(toIndex, 0, removed);
      return newItems;
    });
  };

  const handleReorderSource = (fromIndex: number, toIndex: number) => {
    setSourceDroplets((current) => {
      const newItems = [...current];
      const [removed] = newItems.splice(fromIndex, 1);
      newItems.splice(toIndex, 0, removed);
      return newItems;
    });
  };

  const [isOpen, setIsOpen] = useState(false);
  const onOpenChange = (open: boolean) => {
    if (!open) {
      setIsOpen(false);
    } else {
      setIsOpen(true);
    }
  };

  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [tempQuery, setTempQuery] = useState(searchParams.get("q") || "");

  const updateQueryString = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set("q", value);
    } else {
      params.delete("q");
    }
    router.push(`${pathname}?${params.toString()}`);
  };

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
    setIsOpen(true);

    const updatePlaylistData = {
      name,
      isPublic,
      droplets: selectedDroplets.map((droplet) => ({ id: droplet.id })),
      author: { id: author.id },
      userId,
      slug,
    };
    const playlistData = {
      name,
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
        if (!response.ok) {
          setError(response.error || "Failed to update Playlist!");
        }
        setIsOpen(true);
      } else {
        response = await createPlaylist(playlistData);
        if (!response.ok) {
          setError(response.error || "Failed to create Playlist!");
        }
      }
    } catch (error) {
      console.error("Error saving playlist:", error);
      setError("An unexpected error occurred");
    }

    // const response = await createPlaylist(playlistData);

    // if (response.ok) {
    //   router.push(`/p/${response.data.attributes.slug}`);
    // } else {
    //   setError(response.error || "Failed to create Playlist!");
    // }
  };
  const filteredDroplets = sourceDroplets.filter((droplet) =>
    droplet.name.toLowerCase().includes(tempQuery.toLowerCase()),
  );

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-6xl space-y-8"
      role="form"
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="name">
            Playlist Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter playlist name"
            className="max-w-xl"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="public"
            checked={isPublic}
            onCheckedChange={setIsPublic}
          />
          <Label htmlFor="public">Make this playlist public</Label>
        </div>
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Select and Arrange Droplets</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {selectedDroplets.length} droplets selected ({totalLessons} lessons
            total)
          </p>
        </div>

        <Separator className="mb-4 dark:bg-slate-300" />

        <div className="flex justify-end space-x-4 pt-4 pb-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/my-content")}
            className="h-12 bg-white text-black dark:bg-slate-300 dark:hover:bg-slate-400 dark:hover:text-black"
          >
            <MoveLeftIcon size={16} />
            Cancel
          </Button>
          <Button
            type="submit"
            className="h-12 dark:bg-slate-300 dark:hover:bg-slate-400 dark:hover:text-black"
          >
            Save Playlist
          </Button>
          <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[825px]">
              <DialogHeader>
                <DialogTitle className="dark:text-slate-300">
                  Would you like to announce these changes to everyone enrolled
                  in this playlist?
                </DialogTitle>
              </DialogHeader>

              <div className="mt-4 flex flex-col gap-4">
                <Button
                  className="dark:bg-slate-300"
                  onClick={handlePlaylistPost}
                >
                  Share
                </Button>
                <Button
                  className="dark:bg-slate-300"
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
        </div>
        {error && <p className="text-center text-red-500">{error}</p>}

        <div
          className="xs:max-w-sm flex items-center space-x-2"
          onSubmit={(e) => {
            e.preventDefault();
            updateQueryString(tempQuery);
          }}
        >
          <Input
            type="search"
            placeholder="Search Droplets..."
            className="w-full md:w-[125px] lg:w-[300px]"
            value={tempQuery}
            onChange={(e) => setTempQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
              }
            }}
          />
          <Button
            before={<SearchIcon />}
            onClick={() => updateQueryString(tempQuery)}
            className="dark:bg-slate-300"
            type="button"
          >
            <span className="sr-only md:not-sr-only">Search</span>
          </Button>
        </div>

        <DndProvider backend={HTML5Backend}>
          <div className="grid grid-cols-2 gap-8 pt-4">
            <div className="space-y-4">
              <h3 className="font-semibold dark:text-slate-300">
                Available Droplets
              </h3>
              <DraggableTileList
                droplets={filteredDroplets}
                onDropToOther={handleDropToSource}
                onReorder={handleReorderSource}
                listType="source"
              />
            </div>
            <div className="space-y-4">
              <h3 className="font-semibold dark:text-slate-300">
                Selected Droplets
              </h3>
              <DraggableTileList
                droplets={selectedDroplets}
                onDropToOther={handleDropToSelected}
                onReorder={handleReorderSelected}
                listType="selected"
              />
            </div>
          </div>
        </DndProvider>
      </div>
    </form>
  );
}
