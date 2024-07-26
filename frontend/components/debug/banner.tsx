"use client";

import { cn } from "@/lib/utils";
import useDebugStore from "@/stores/debug-toggle-store";

export function DebugBanner({ className }: { className?: string }) {
  const isDebugEnabled = useDebugStore((state) => state.debugModeEnabled);
  if (!isDebugEnabled) return null;

  return (
    <div
      className={cn(
        "relative py-1 z-10 w-full text-center text-xs uppercase font-mono font-medium text-white bg-sky-800",
        className
      )}
    >
      <p className="inline-flex flex-row items-center gap-2">
        &lt; Debug Mode Enabled &gt;
      </p>
    </div>
  );
}
