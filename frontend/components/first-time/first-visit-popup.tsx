"use client"

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { ArrowRightIcon } from "lucide-react";
import { toast } from "sonner";
import { updateFirstTimeStatus } from "@/lib/actions";
import { AuthorizedUser, User } from "@/types";

export function FirstVisitPopup({ user }: { user: AuthorizedUser | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user?.firstTime) {
        setIsOpen(true);
      }
  }, [user]);

  const handleClose = async () => {
    if (!name.trim()) {
      toast.error("Please enter your name before continuing");
      return;
    }

    setIsSubmitting(true);
    try {
      if (user) {
        await updateFirstTimeStatus(user.id);
        // TODO: update name and bio here as well
        setIsOpen(false);
      }
    } catch (error) {
      console.error("Failed to save your information. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onOpenChange = (open: boolean) => {
    if (!open && !name.trim()) {
      toast.error("Please enter your name before continuing");
      return;
    }
    if (!open) {
      handleClose();
    } else {
      setIsOpen(true);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[825px]">
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
            Enter your name here: <span className="text-red-500">*</span>
          </p>
          <Textarea 
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name (required)"
            required
          />
        </div>
        <div className="flex flex-col gap-4 mt-4">
          <p className="text-sm text-slate-600">
            Enter a brief bio here:
          </p>
          <Textarea 
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell us about yourself (optional)"
          />
        </div>
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