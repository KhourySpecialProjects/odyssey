"use client";

import { useState, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { MoveLeftIcon, SearchIcon, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import DraggableTileList from "@/components/droplets/draggable_tile_list";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { createPlaylist, deletePlaylist } from "@/lib/actions";
import { updatePlaylist } from "@/lib/actions";
import { createPlaylistAnnouncement } from "@/lib/requests/feed";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";

interface PlaylistFormProps {
  droplets: any[];
  author: any;
  userId: number;
  existingPlaylist?: {
    id: number;
    name: string;
    slug: string;
    isPublic: boolean;
    droplets?: any[];
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
  const [slug, setSlug] = useState(existingPlaylist?.slug || "");
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

  const handleDelete = async () => {
    if (existingPlaylist) {
      const response = await deletePlaylist(existingPlaylist.id);
      if (response.ok && !response.error) {
        router.replace(`/drafts`);
      }
    }
  };

  const handlePlaylistPost = async () => {
    try {
      if (existingPlaylist) {
        await createPlaylistAnnouncement(
          existingPlaylist.name,
          existingPlaylist?.id,
        );
        router.back();
      }
    } catch (error) {
      console.error("Failed to make playlist announcement: ", error);
    }
  };

  const handleDropToSelected = useCallback((droplet: any) => {
    setSourceDroplets((current) => current.filter((d) => d.id !== droplet.id));
    setSelectedDroplets((current) => [...current, droplet]);
  }, []);

  const handleDropToSource = useCallback((droplet: any) => {
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
    if (!name) {
      setError("Please enter a playlist name");
      return;
    }
    if (selectedDroplets.length === 0) {
      setError("Please select at least one droplet");
      return;
    }

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
        if (response.ok) {
          //router.push(`/p/${response.data.attributes.slug}`);
        } else {
          setError(response.error || "Failed to update Playlist!");
        }
      } else {
        response = await createPlaylist(playlistData);
        if (response.ok) {
          //router.push(`/p/${response.data.attributes.slug}`);
        } else {
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
    <form onSubmit={handleSubmit} className="w-full max-w-6xl space-y-8">
      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Playlist Name</Label>
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
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Select and Arrange Droplets</h2>
          <p className="text-sm text-slate-600">
            {selectedDroplets.length} droplets selected ({totalLessons} lessons
            total)
          </p>
        </div>

        <Separator className="mb-4" />

        {/*TODO: Why aren't the buttons the same size?
           This may not be the best placement for the buttons.  But at the bottom of the columns 
           seems like a bad choice as well, especially as the list of droplets increases*/}
        <div className="flex justify-end space-x-4 pt-4 pb-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            className="h-12 bg-white text-black"
          >
            <MoveLeftIcon size={16} />
            Cancel
          </Button>
          {/* <Button variant="destructive" className="h-12" onClick={handleDelete}>
            Delete Playlist
          </Button> */}
          <Button
            type="submit"
            className="h-12"
            onClick={() => setIsOpen(true)}
          >
            Save Playlist
          </Button>
          <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[825px]">
              <DialogHeader>
                <DialogTitle>
                  Would you like to announce these changes to everyone enrolled
                  in this playlist?
                </DialogTitle>
              </DialogHeader>

              <div className="flex flex-col gap-4 mt-4">
                <Button onClick={handlePlaylistPost}>Share</Button>
                <Button onClick={() => router.back()}>Not Now</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div
          className="flex items-center space-x-2 xs:max-w-sm"
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
          >
            <span className="sr-only md:not-sr-only">Search</span>
          </Button>
        </div>

        <DndProvider backend={HTML5Backend}>
          <div className="grid grid-cols-2 gap-8 pt-4">
            <div className="space-y-4">
              <h3 className="font-semibold">Available Droplets</h3>
              <DraggableTileList
                droplets={filteredDroplets}
                onDropToOther={handleDropToSource}
                onReorder={handleReorderSource}
                listType="source"
              />
            </div>
            <div className="space-y-4">
              <h3 className="font-semibold">Selected Droplets</h3>
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

      {error && <p className="text-red-500">{error}</p>}
    </form>
  );
}
