"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { toast } from "sonner";
import { updateFirstTimeStatus, updateOnboardingInfo } from "@/lib/actions";
import { AuthorizedUser } from "@/types";
import { Input } from "../ui/input";
import Image from "next/image";
import { useRouter } from "next/navigation";

export function FirstVisitPopup({ user }: { user: AuthorizedUser | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [bio, setBio] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (!user?.firstTime === false) {
      setIsOpen(true);
    }
  }, [user]);

  const handleClose = async () => {
    if (!firstName.trim()) {
      toast.error("Please enter your first name before continuing");
      return;
    }
    if (!lastName.trim()) {
      toast.error("Please enter your last name before continuing");
      return;
    }
    try {
      if (user) {
        await updateFirstTimeStatus(user.id);
        await updateOnboardingInfo(firstName, lastName, bio, user.id);
        setIsOpen(false);
        router.push("/d/introduction-to-odyssey");
      }
    } catch (error) {
      console.error("Failed to save your information. Please try again.");
    }
  };

  const onOpenChange = (open: boolean) => {
    if (!open && !firstName.trim()) {
      toast.error("Please enter your first name before continuing");
      return;
    }
    if (!open && !lastName.trim()) {
      toast.error("Please enter your last name before continuing");
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
        <Image
          src="/logo.svg"
          alt="Khoury Odyssey Logo"
          width={200}
          height={55}
          priority
        />
        <DialogHeader>
          <DialogTitle>Welcome to Khoury Odyssey!</DialogTitle>
          <DialogDescription>
            {/* ... existing description ... */}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 mt-4">
          <p className="text-sm text-slate-600">
            Enter your first name here: <span className="text-red-500">*</span>
          </p>
          <Input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="First name (required)"
            required
            aria-label="First name"
          />
        </div>
        <div className="flex flex-col gap-4 mt-4">
          <p className="text-sm text-slate-600">
            Enter your last name here: <span className="text-red-500">*</span>
          </p>
          <Input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Last name (required)"
            required
            aria-label="Last name"
          />
        </div>
        <div className="flex flex-col gap-4 mt-4">
          <p className="text-sm text-slate-600">Enter a brief bio here:</p>
          <Textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell us about yourself (optional)"
            aria-label="Bio"
          />
        </div>
        <div className="flex flex-col gap-4 mt-4">
          <p className="text-sm text-slate-600">
            Get started by exploring our collection of Droplets - bite-sized
            learning modules designed to help you succeed in your academic
            journey.
          </p>
          <Button onClick={() => handleClose()}>Start Exploring</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
