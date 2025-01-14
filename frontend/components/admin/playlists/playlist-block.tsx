"use client";

import { Button } from "@/components/ui/button";
import { updatePlaylist } from "@/lib/actions";
import { Playlist } from "@/types";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

export function PlaylistBlock({ playlist }: { playlist: Playlist }) {
    
  const handleUpdatePlaylist = async (formData: FormData) => {
    const isPublic = formData.get("isPublic") === "true";
    const result = await updatePlaylist(playlist.id, {
        name: playlist.name,
        isPublic: !isPublic,
        droplets: playlist.droplets?.map(d => ({ id: d.id })) || [],
        author: { id: playlist.author?.id || 0 },
        userId: playlist.author?.id || 0,
        slug: playlist.slug
      });
    
    if (result.ok) {
        toast.success(`Playlist updated successfully`);
    } else {
        toast.error("Failed to update playlist");
        console.error(result.error);
    }
  };

  return (
    <li className="py-0 [&:not(:first-child)]:pt-3">
      <div className="flex items-center space-x-4">
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate text-slate-900 dark:text-white">
            {playlist.name}
            {playlist.isPublic ? " (Public)" : ""}
          </p>
        </div>

        <div className="inline-flex items-center gap-2">
          <form action={handleUpdatePlaylist}>
            <input
              id="id"
              name="id"
              type="number"
              defaultValue={playlist.id}
              hidden
            />
            <input
              id="isPublic"
              name="isPublic"
              type="text"
              defaultValue={String(playlist.isPublic)}
              hidden
            />
            <SubmitButton destructive={!playlist.isPublic}>
              {playlist.isPublic ? "Make Private" : "Make Public"}
            </SubmitButton>
          </form>
        </div>
      </div>
    </li>
  );
}

function SubmitButton({
  destructive,
  children,
}: {
  destructive?: boolean;
  children: React.ReactNode;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      size="sm"
      variant={destructive ? "destructive" : "link"}
      aria-disabled={pending}
    >
      {children}
    </Button>
  );
}
