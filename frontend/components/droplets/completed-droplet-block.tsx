"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { useState } from "react";
import { AuthorizedUser, Droplet } from "@/types";
import { GradientBackground } from "../gradient-bg";
import { updateEnrollmentFirstTime } from "@/lib/actions";
import { createFriendAnnouncement } from "@/lib/requests/feed";

export function CompletedDropletBlock({
  droplet,
  enrollmentId,
  authUser,
}: {
  droplet: Droplet;
  enrollmentId: string;
  authUser: AuthorizedUser;
}) {
  const [open, setOpen] = useState(true);
  const handleClose = async () => {
    try {
      await updateEnrollmentFirstTime(enrollmentId);
      setOpen(false);
    } catch (error) {
      console.error("Failed to update enrollment status:", error);
    }
  };

  const handleShare = async () => {
    try {
      await createFriendAnnouncement(droplet, authUser);
      await updateEnrollmentFirstTime(enrollmentId);
      setOpen(false);
    } catch (error) {
      console.error("Failed to share with network: ", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogTitle></DialogTitle>
        <DialogHeader>
          <GradientBackground className="px-0">
            <div className="max-w-2xl mx-auto">
              <p className="text-slate-500 text-pretty md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-slate-400">
                <strong>You did it!</strong> Congratulations on completing this
                &ldquo;{droplet.name}
                &rdquo; Droplet.
              </p>
            </div>
            <div className="pt-5 flex justify-center">
              <Button onClick={handleShare} disabled={false}>
                Share with friends
              </Button>
            </div>
          </GradientBackground>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
