"use client";

import { Button } from "../ui/button";
import { giveKudos } from "@/lib/kudos";
import { ThumbsUp } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

export function KudosButton({ announcementId }: { announcementId: number }) {
  const [isPending, startTransition] = useTransition();
  const [isVisible, setIsVisible] = useState(true);

  const handleClick = () => {
    startTransition(async () => {
      const result = await giveKudos(announcementId);
      if (result.success) {
        toast.success("Kudos given!");
        setIsVisible(false);
      } else {
        toast.error("Failed to give kudos");
      }
    });
  };

  return (
    <Button
      type="button"
      size="xs"
      onClick={handleClick}
      disabled={isPending}
      className={`border border-yellow-600 bg-yellow-300 text-yellow-900 hover:bg-gray-200 dark:bg-yellow-400 ${isVisible ? "visiblity: visible" : "visibility: hidden"}`}
    >
      {isPending ? "Giving..." : "Give Kudos"}
      <ThumbsUp className="h-4 w-4" />
    </Button>
  );
}
