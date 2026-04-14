"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  claimVoyageDropletNode,
  unclaimVoyageDropletNode,
} from "@/lib/requests/voyage-enrollment";

interface ClaimNodeButtonProps {
  voyageNodeId: number;
  mode?: "claim" | "unclaim";
}

export function ClaimNodeButton({
  voyageNodeId,
  mode = "claim",
}: ClaimNodeButtonProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      if (mode === "claim") {
        const result = await claimVoyageDropletNode(voyageNodeId);
        if (result.ok && "data" in result && result.data?.dropletSlug) {
          router.push(`/d/${result.data.dropletSlug}`);
        } else if (!result.ok) {
          console.error("Failed to claim node:", result.error);
        }
      } else {
        const result = await unclaimVoyageDropletNode(voyageNodeId);
        if (!result.ok) {
          console.error("Failed to unclaim node:", result.error);
        }
      }
    });
  }

  if (mode === "unclaim") {
    return (
      <button
        onClick={handleClick}
        disabled={isPending}
        className={cn(
          "inline-flex items-center rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600",
          "dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-red-700 dark:hover:bg-red-950/20 dark:hover:text-red-400",
          "disabled:cursor-not-allowed disabled:opacity-60",
        )}
      >
        {isPending ? "Unclaiming..." : "Unclaim"}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={cn(
        "inline-flex items-center rounded-lg bg-[#297496] px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-[#225f7a]",
        "disabled:cursor-not-allowed disabled:opacity-60",
      )}
    >
      {isPending ? "Claiming..." : "Claim this Droplet"}
    </button>
  );
}
