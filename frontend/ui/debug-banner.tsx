"use client";

import { cn } from "@/lib/utils";
import useDebugStore from "@/stores/debug-store";
import { BugIcon } from "lucide-react";

export function DebugBanner({ className }: { className?: string }) {
  const isDebugEnabled = useDebugStore((state) => state.debug);

  if (!isDebugEnabled) return null;

  return (
    <div
      className={cn(
        "py-2 w-full text-center text-sm uppercase font-medium text-black bg-slate-100 rounded-md",
        className
      )}
    >
      <p className="inline-flex flex-row items-center gap-2">
        <BugIcon className="w-4 h-4" />
        Debug Mode Enabled
      </p>
    </div>
  );
}
