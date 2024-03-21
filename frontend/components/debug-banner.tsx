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
        "py-1 w-full text-center text-xs uppercase font-medium text-white bg-cyan-800",
        className
      )}
    >
      <p className="inline-flex flex-row items-center gap-2">
        <BugIcon className="w-3 h-3" />
        Debug Mode Enabled
      </p>
    </div>
  );
}
