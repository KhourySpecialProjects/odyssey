"use client";

import { Button } from "../ui/button";
import { giveKudos } from "@/lib/kudos";
import { useEffect, useState, useTransition } from "react";
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
      className={`bg-white dark:bg-slate-500 dark:text-slate-300 text-black border border-black hover:bg-gray-200 ${isVisible ? "visiblity: visible" : "visibility: hidden"}`}
    >
      {isPending ? "Giving..." : "Give Kudos"}
    </Button>
  );
}
