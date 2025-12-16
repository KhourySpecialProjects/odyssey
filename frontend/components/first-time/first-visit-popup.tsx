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
import { AuthorizedUser } from "@/types";
import { Input } from "../ui/input";
import { useRouter } from "next/navigation";
import { Logo } from "../header/logo";
import { createSystemAnnouncement } from "@/lib/requests/feed";
import { updateUserInfo } from "@/lib/requests/authorized-user";
import { setTimeZone } from "@/lib/actions";
import {
  createEnrollment,
  getEnrollmentsByAuthorizedUser,
} from "@/lib/requests/enrollment";
import { getDropletById } from "@/lib/requests/droplet";
import { Droplet } from "@/types";

const timeZones = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Phoenix",
  "America/Los_Angeles",
  "America/Anchorage",
  "America/Honolulu",
  "America/Bogota",
  "America/Lima",
  "America/Caracas",
  "America/Santiago",
  "America/Argentina/Buenos_Aires",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "Europe/Madrid",
  "Europe/Rome",
  "Europe/Athens",
  "Europe/Istanbul",
  "Europe/Moscow",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Asia/Bangkok",
  "Asia/Singapore",
  "Asia/Jakarta",
  "Asia/Hong_Kong",
  "Australia/Sydney",
  "Australia/Melbourne",
  "Australia/Brisbane",
  "Pacific/Auckland",
  "Pacific/Fiji",
  "Africa/Cairo",
  "Africa/Johannesburg",
  "Africa/Lagos",
  "Africa/Nairobi",
];

export function FirstVisitPopup({ user }: { user: AuthorizedUser | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [bio, setBio] = useState("");
  const [timeZone, setThisTimeZone] = useState("");
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
    if (!timeZone.trim()) {
      toast.error("Please select your time zone before continuing");
      return;
    }
    try {
      if (user) {
        await updateUserInfo(user.id, { firstTime: false });
        await updateUserInfo(user.id, {
          first: firstName,
          last: lastName,
          bio: bio,
        });
        await setTimeZone(timeZone + "  ", user.id);
        await createSystemAnnouncement(
          "Want to see what your friends are up to? Their activity will appear here on your feed — just head to your profile to follow them!",
          user,
        );
        await createSystemAnnouncement(
          "Hey there — welcome to Odyssey! This is where you'll see updates to your droplets, playlists, and groups.",
          user,
        );
        const introDroplet = await getDropletById<Droplet>(43);
        const enrollData = await getEnrollmentsByAuthorizedUser(user.id);
        if (
          enrollData &&
          !enrollData.some((enroll) => enroll.droplet.id === 43)
        ) {
          await createEnrollment(introDroplet, []);
        }
        setIsOpen(false);
        router.push("/d/introduction-to-odyssey");
      }
    } catch {
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
        <Logo width={200} height={55} />
        <DialogHeader>
          <DialogTitle>Welcome to Khoury Odyssey!</DialogTitle>
          <DialogDescription>
            {/* ... existing description ... */}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 flex flex-col gap-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
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
        <div className="mt-4 flex flex-col gap-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
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
        <div className="mt-4 flex flex-col gap-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Enter a brief bio here:
          </p>
          <Textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell us about yourself (optional)"
            aria-label="Bio"
            className="focus:ring-0"
          />
        </div>
        <div className="mt-4 flex flex-col gap-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Choose your time zone: <span className="text-red-500">*</span>
          </p>
          <select
            aria-label="Choose a time zone..."
            className="w-[50%] rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-slate-800 dark:bg-black dark:text-white"
            value={timeZone}
            onChange={(e) => setThisTimeZone(e.target.value)}
          >
            <option value="" disabled>
              Choose a time zone...
            </option>
            {timeZones.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-4 flex flex-col gap-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
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
