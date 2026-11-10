import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SaveStatus } from "@/hooks/useSaveStatus";

const LABELS: Record<SaveStatus, string> = {
  idle: "",
  pending: "Unsaved changes",
  saving: "Saving…",
  saved: "Saved just now",
  failed: "Save failed",
  frozen: "In review, changes aren't saved",
};

/**
 * The autosave state in the editor toolbar. The live region is always mounted
 * so screen readers announce each change politely.
 */
export function SaveStatusIndicator({
  status,
  onRetry,
}: {
  status: SaveStatus;
  onRetry: () => void;
}) {
  return (
    <div
      data-testid="save-status"
      aria-live="polite"
      className={cn(
        "flex items-center gap-2 text-sm",
        status === "failed"
          ? "text-red-700 dark:text-red-300"
          : status === "frozen"
            ? "text-amber-800 dark:text-amber-200"
            : "text-slate-500 dark:text-slate-400",
      )}
    >
      <span>{LABELS[status]}</span>
      {status === "failed" && (
        <Button size="sm" variant="outline" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
