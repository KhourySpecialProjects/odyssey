"use client";

import { Button } from "../ui/button";
import { giveKudos } from "@/lib/kudos";
import { useState, useTransition } from "react";
import { toast } from "sonner";

export function KudosButton() {
  const [isPending, startTransition] = useTransition();
  const [isVisible, setIsVisible] = useState(true);

  const handleClick = () => {
    startTransition(async () => {
      const result = await giveKudos();
      setIsVisible(false);
      if (result.success) {
        toast.success("Kudos given!");
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
      className={`bg-white text-black border border-black hover:bg-gray-200 ${isVisible ? "visiblity: visible" : "visibility: hidden"}`}
    >
      {isPending ? "Giving..." : "Give Kudos"}
    </Button>
  );
}
