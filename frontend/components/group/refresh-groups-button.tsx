"use client";

import { useState } from "react";
import { IconRefresh } from "@tabler/icons-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { refreshUserGroups } from "@/lib/requests/groups";

export function RefreshGroupsButton() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function handleRefresh() {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const res = await refreshUserGroups();
      if (res.ok) {
        toast.success("Groups refreshed");
      } else {
        toast.error("Couldn't refresh groups. Please try again.");
      }
    } catch {
      toast.error("Couldn't refresh groups. Please try again.");
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleRefresh}
      disabled={isRefreshing}
      aria-busy={isRefreshing}
      className="flex items-center gap-2 rounded-[12px] border border-slate-200 bg-[#FCFCFD] text-[14px] text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
    >
      <IconRefresh
        aria-hidden="true"
        className={cn("h-4 w-4", isRefreshing && "motion-safe:animate-spin")}
      />
      {isRefreshing ? "Refreshing…" : "Refresh"}
    </Button>
  );
}
