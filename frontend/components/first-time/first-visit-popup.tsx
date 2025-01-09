"use client"

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { Button } from "../ui/button";
import { ArrowRightIcon } from "lucide-react";
import { updateFirstTimeStatus } from "@/lib/actions";
import { AuthorizedUser, User } from "@/types";

export function FirstVisitPopup({ user }: { user: AuthorizedUser | null }) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (user?.firstTime) {
        setIsOpen(true);
      }
  }, [user]);

  const handleClose = async () => {
    if (user) {
      await updateFirstTimeStatus(user.id);
      console.log("first time: ", user.firstTime)
    }
    setIsOpen(false);
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) handleClose();
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Welcome to Khoury Odyssey!</DialogTitle>
          <DialogDescription>
            Odyssey is a new platform designed to provide on-demand access to
            modern knowledge and skills pertinent to today's undergraduate
            Khoury students.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 mt-4">
          <p className="text-sm text-slate-600">
            Get started by exploring our collection of Droplets - bite-sized learning
            modules designed to help you succeed in your academic journey.
          </p>
          
          <Button onClick={() => handleClose()} after={<ArrowRightIcon />}>
            Start Exploring
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}