'use client';

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { togglePlaylistEnrollment } from "@/lib/requests/playlist-enrollment";

interface PlaylistEnrollButtonProps {
  playlistId: number;
  isEnrolled: boolean;
  isPublic: boolean;
}

export function PlaylistEnrollButton({ 
  playlistId, 
  isEnrolled,
  isPublic
}: PlaylistEnrollButtonProps) {
  const [isPending, setIsPending] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const router = useRouter();

  const handleClick = async () => {
    if (!isPublic && isEnrolled) {
      setShowWarning(true);
      return;
    }

    if (!isPublic) {
      return; // Don't allow enrolling in private playlists
    }

    await handleEnrollmentChange();
  };

  const handleEnrollmentChange = async () => {
    setIsPending(true);
    try {
      const result = await togglePlaylistEnrollment(playlistId);
      if (!result.success) {
        throw new Error(result.error);
      }
      router.refresh();
    } catch (error) {
      console.error('Error updating enrollment:', error);
    } finally {
      setIsPending(false);
      setShowWarning(false);
    }
  };

  // Don't show button for private playlists that user isn't enrolled in
  if (!isPublic && !isEnrolled) {
    return null;
  }

  return (
    <>
      <Button
        onClick={handleClick}
        disabled={isPending}
        variant={isEnrolled ? "destructive" : "default"}
        className="w-full sm:w-auto"
      >
        {isPending ? (
          "Loading..."
        ) : isEnrolled ? (
          "Remove from My Playlists"
        ) : (
          "Add to My Playlists"
        )}
      </Button>

      <Dialog open={showWarning} onOpenChange={setShowWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Private Playlist?</DialogTitle>
            <DialogDescription>
              This is a private playlist. If you remove it, you will need to contact the playlist creator to regain access.
              Are you sure you want to continue?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowWarning(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleEnrollmentChange}
            >
              Remove Playlist
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 