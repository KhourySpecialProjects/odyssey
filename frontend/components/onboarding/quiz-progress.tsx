import { cn } from "@/lib/utils";

/** "Step n of total" with one bar segment per step. */
export function QuizProgress({ step, total }: { step: number; total: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-500">
        <span>
          Step {step} of {total}
        </span>
        <span>About a minute</span>
      </div>
      <div
        role="progressbar"
        aria-label="Quiz progress"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={step}
        className="mt-1.5 flex gap-2"
      >
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full",
              i < step ? "bg-onboarding" : "bg-slate-200 dark:bg-slate-700",
            )}
          />
        ))}
      </div>
    </div>
  );
}
