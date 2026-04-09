import { cn } from "@/lib/utils";

interface VoyageProgressBarProps {
  completionPercentage: number;
  completedCount: number;
  totalCount: number;
}

/**
 * Displays a horizontal progress bar showing voyage completion status.
 * Renders a green fill on a slate-200 track, with "X of Y completed" text
 * and the percentage on the right.
 */
export function VoyageProgressBar({
  completionPercentage,
  completedCount,
  totalCount,
}: VoyageProgressBarProps) {
  const clampedPercentage = Math.min(100, Math.max(0, completionPercentage));

  return (
    <div className="w-full space-y-1">
      <div className="flex items-center gap-2">
        <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-slate-200">
          <div
            className={cn(
              "h-full rounded-full bg-green-500 transition-all duration-500 ease-in-out",
            )}
            style={{ width: `${clampedPercentage}%` }}
          />
        </div>
        <span className="w-10 shrink-0 text-right text-xs font-medium text-slate-600">
          {clampedPercentage}%
        </span>
      </div>
      <p className="text-xs text-slate-500">
        {completedCount} of {totalCount} completed
      </p>
    </div>
  );
}
