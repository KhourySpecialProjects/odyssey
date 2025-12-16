"use client";

import { cn } from "@/lib/utils";
import useDebugStore from "@/stores/debug-toggle-store";

export function DebugBanner({ className }: { className?: string }) {
  const isDebugEnabled = useDebugStore((state) => state.debugModeEnabled);
  if (!isDebugEnabled) return null;

  return (
    <div
      className={cn(
        "relative z-10 w-full bg-sky-800 py-1 text-center font-mono text-xs font-medium text-white uppercase",
        className,
      )}
    >
      <p className="inline-flex flex-row items-center gap-2">
        &lt; Debug Mode Enabled &gt;
      </p>
    </div>
  );
}
