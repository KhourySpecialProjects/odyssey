"use client";

import { useRef, useState } from "react";
import { IconRefresh } from "@tabler/icons-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { refreshGroup } from "@/lib/requests/groups";

export function RefreshGroupButton({ slug }: { slug: string }) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  // Synchronous in-flight guard. `disabled` on a focused button would drop
  // focus to <body> for keyboard users, so we rely on aria-disabled (a
  // presentational hint only) plus this ref to actually block re-entrant
  // clicks, instead of the DOM disabled attribute.
  const isRefreshingRef = useRef(false);

  async function handleRefresh() {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;
    setIsRefreshing(true);
    try {
      const res = await refreshGroup(slug);
      if (res.ok) {
        toast.success("Group refreshed");
      } else {
        toast.error("Couldn't refresh group. Please try again.");
      }
    } catch {
      toast.error("Couldn't refresh group. Please try again.");
    } finally {
      isRefreshingRef.current = false;
      setIsRefreshing(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleRefresh}
      aria-disabled={isRefreshing}
      aria-busy={isRefreshing}
      className={cn(
        "flex items-center gap-2 rounded-[12px] border border-slate-200 bg-[#FCFCFD] text-[14px] text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700",
        "aria-disabled:cursor-not-allowed aria-disabled:opacity-50",
      )}
    >
      <IconRefresh
        aria-hidden="true"
        className={cn("h-4 w-4", isRefreshing && "motion-safe:animate-spin")}
      />
      {isRefreshing ? "Refreshing…" : "Refresh"}
    </Button>
  );
}
