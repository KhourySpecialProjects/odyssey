"use client";

import { Announcement, AuthorizedUser } from "@/types";
import { Button } from "../ui/button";
import { giveKudos } from "@/lib/kudos";
import { ThumbsUp } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

export function KudosButton({
  announcement,
  droplet,
  authUser,
}: {
  announcement: Announcement;
  droplet: string;
  authUser: AuthorizedUser;
}) {
  const [isPending, startTransition] = useTransition();
  const [isVisible, setIsVisible] = useState(
    !announcement.kudosGiven?.some((user) => user.id === authUser.id),
  );

  const handleClick = () => {
    startTransition(async () => {
      const result = await giveKudos(announcement.id, droplet);
      if (result.success) {
        toast.success("Kudos given!");
        setIsVisible(false);
      } else {
        toast.error("Failed to give kudos");
      }
    });
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Button
      type="button"
      size="xs"
      onClick={handleClick}
      disabled={isPending}
      className={`mr-2 border border-2 bg-transparent text-slate-700 border-slate-700 hover:bg-yellow-300 dark:bg-transparent dark:text-slate-200 dark:border-slate-200 dark:hover:bg-yellow-600 ${isVisible ? "visiblity: visible" : "visibility: hidden"}`}
    >
      {/*isPending ? "Giving..." : "Give Kudos"*/}
      <ThumbsUp className="h-6 w-6" />
    </Button>
  );
}
