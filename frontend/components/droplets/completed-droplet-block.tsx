"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { useState } from "react";
import { AuthorizedUser, Droplet, Enrollment } from "@/types";
import { GradientBackground } from "../gradient-bg";
import { createFriendAnnouncement } from "@/lib/requests/feed";
import { updateEnrollmentFirstTime } from "@/lib/requests/enrollment";

export function CompletedDropletBlock({
  droplet,
  enrollment,
  authUser,
}: {
  droplet: Droplet;
  enrollment: Enrollment;
  authUser: AuthorizedUser;
}) {
  const [open, setOpen] = useState(enrollment.isFirstTime);
  const handleClose = async () => {
    try {
      await updateEnrollmentFirstTime(enrollment.id);
      setOpen(false);
    } catch (error) {
      console.error("Failed to update enrollment status:", error);
    }
  };

  const handleShare = async () => {
    try {
      await createFriendAnnouncement(droplet, authUser);
      await updateEnrollmentFirstTime(enrollment.id);
      setOpen(false);
    } catch (error) {
      console.error("Failed to share with network: ", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="border dark:border-slate-500">
        <DialogTitle></DialogTitle>
        <DialogHeader>
          <GradientBackground className="h-60 min-h-0 px-0">
            <div className="mx-auto max-w-2xl">
              <p className="text-pretty text-slate-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-slate-400">
                <strong>You did it!</strong> Congratulations on completing this
                &ldquo;{droplet.name}
                &rdquo; Droplet.
              </p>
            </div>
            <div className="flex justify-center pt-5">
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
