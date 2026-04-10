"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { useState } from "react";
import { AuthorizedUser, Droplet, Enrollment } from "@/types";
import { createFriendAnnouncement } from "@/lib/requests/feed";
import { updateEnrollmentFirstTime } from "@/lib/requests/enrollment";
import { IconX } from "@tabler/icons-react";

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
      <DialogContent className="border bg-white dark:border-slate-500 dark:bg-zinc-950">
        <DialogTitle></DialogTitle>
        <DialogHeader>
          <div className="relative px-6 py-8">
            <button
              className="absolute top-0 right-0 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              onClick={handleClose}
            >
              <IconX className="h-5 w-5" stroke={1.8} />
            </button>
            <div className="mx-auto max-w-2xl">
              <p className="text-pretty text-slate-700 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-slate-300">
                <strong>You did it!</strong> Congratulations on completing this
                &ldquo;{droplet.name}&rdquo; Droplet.
              </p>
            </div>
            <div className="flex justify-center pt-5">
              <button
                onClick={handleShare}
                className="flex h-10 items-center justify-center rounded-lg border border-[#2D7597] bg-[#2D7597] px-4 text-sm font-medium text-white shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] transition-colors hover:bg-[#255e78]"
              >
                Share with friends
              </button>
            </div>
          </div>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
