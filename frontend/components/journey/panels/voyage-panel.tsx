import { cn } from "@/lib/utils";
import { IconLock } from "@tabler/icons-react";
import { SAMPLE_VOYAGE } from "../journey-config";
import { AppFrame, PRESSABLE, type PanelProps } from "./app-frame";

// Replica of the voyage page (app/(voyages)/v/[slug]/page.tsx): the left
// column with enrollment and the "Journey" list, and the island tree map
// (components/voyages/voyage-tree-map.tsx) on the right.

type Step = {
  n: number;
  label: string;
  sub: string;
  status: "completed" | "available" | "locked";
  branch?: "optional";
};

const STEPS: Step[] = [
  { n: 1, label: "Git Fundamentals", sub: "1 droplet", status: "completed" },
  { n: 2, label: "Testing Essentials", sub: "3 droplets", status: "available" },
  {
    n: 0,
    label: "Debugging Basics",
    sub: "1 droplet",
    status: "available",
    branch: "optional",
  },
  { n: 3, label: "Web Development", sub: "4 droplets", status: "locked" },
  { n: 4, label: "Software Design", sub: "3 droplets", status: "locked" },
];

function StepCircle({ step }: { step: Step }) {
  return (
    <span
      className={cn(
        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
        step.status === "completed" && "bg-green-500 text-white",
        step.status === "available" && "bg-[#297496] text-white",
        step.status === "locked" &&
          "bg-slate-200 text-slate-500 dark:bg-slate-700",
      )}
    >
      {step.status === "completed" ? "✓" : step.n}
    </span>
  );
}

/** A small island in the tree map's palette (voyage-tree-island.tsx). */
function MapIsland({
  status,
  step,
  label,
  small,
  hook,
}: {
  status: Step["status"];
  step?: number;
  label: string;
  small?: boolean;
  hook?: string;
}) {
  const w = small ? 92 : 118;
  const locked = status === "locked";
  return (
    <div data-j={hook} className="relative flex flex-col items-center">
      <svg width={w} height={w * 0.55} viewBox="0 0 200 110" fill="none">
        {locked ? (
          <>
            <ellipse cx="100" cy="62" rx="66" ry="28" fill="#64748b" />
            <ellipse cx="100" cy="58" rx="58" ry="22" fill="#718096" />
          </>
        ) : (
          <>
            <ellipse
              cx="100"
              cy="64"
              rx="92"
              ry="40"
              fill="none"
              strokeWidth="3"
              className={cn(
                "transition-colors duration-500",
                status === "completed"
                  ? "stroke-[#22c55e]"
                  : "stroke-[#60a5fa]",
              )}
            />
            <ellipse
              cx="100"
              cy="64"
              rx="84"
              ry="34"
              fill="#297496"
              opacity="0.12"
            />
            <ellipse cx="100" cy="62" rx="66" ry="28" fill="#F4E5C0" />
            <ellipse cx="100" cy="58" rx="58" ry="22" fill="#4CAF50" />
            <ellipse cx="92" cy="52" rx="26" ry="10" fill="#66BB6A" />
          </>
        )}
      </svg>
      {step !== undefined && (
        <span
          className={cn(
            "absolute top-0 left-2 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-white transition-colors duration-300",
            locked
              ? "bg-slate-400"
              : status === "completed"
                ? "bg-green-500"
                : "bg-[#297496]",
          )}
        >
          {step}
        </span>
      )}
      {locked && <IconLock className="absolute top-3 h-4 w-4 text-white" />}
      <span
        className={cn(
          "-mt-1 rounded-md bg-white px-2 py-1 text-center text-[11px] leading-tight font-semibold text-slate-800 shadow-[0_2px_8px_rgba(12,51,84,0.15)] dark:bg-slate-800 dark:text-slate-200",
          small ? "w-[104px]" : "w-[132px]",
        )}
      >
        {label}
        <span className="block text-[10px] font-normal text-slate-500">
          {status === "locked" ? (
            "Locked"
          ) : status === "completed" ? (
            <>
              1 droplet
              <span className="block">Completed ✓</span>
            </>
          ) : small ? (
            "optional"
          ) : (
            "3 droplets"
          )}
        </span>
      </span>
    </div>
  );
}

export function VoyagePanel({ compact }: PanelProps) {
  return (
    <AppFrame
      hook="panel-voyage"
      url="khouryodyssey.org/v/software-foundations"
      compact={compact}
      className="bg-slate-50 dark:bg-slate-950"
    >
      <div
        className={cn(
          "flex h-full gap-6",
          compact ? "flex-col px-4 pt-3" : "px-7 pt-4",
        )}
      >
        <div
          className={cn(
            "flex shrink-0 flex-col",
            compact ? "w-full" : "w-[250px]",
          )}
        >
          <span className="text-[12px] text-slate-500">← Back to Voyages</span>
          <h2 className="mt-3 text-2xl leading-tight font-bold text-slate-900 dark:text-white">
            {SAMPLE_VOYAGE.name}
          </h2>
          <p className="mt-1 text-[13px] text-slate-600 dark:text-slate-400">
            {SAMPLE_VOYAGE.description}
          </p>
          <span
            data-j="vy-continue"
            className={cn(
              "mt-3 inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[#297496] bg-white text-[13px] font-medium text-[#297496] dark:bg-slate-900",
              PRESSABLE,
            )}
          >
            Continue Voyage
            <span className="rounded-full bg-[#297496] px-2 py-0.5 text-[11px] text-white">
              25%
            </span>
          </span>

          {/* voyage-progress-bar.tsx */}
          <div className="mt-4">
            <div className="flex items-center gap-2">
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div className="h-full w-1/4 rounded-full bg-green-500" />
              </div>
              <span className="text-[12px] font-medium text-slate-700 dark:text-slate-300">
                25%
              </span>
            </div>
            <p className="mt-1 text-[12px] text-slate-500">1 of 4 completed</p>
          </div>

          <h3 className="mt-4 text-sm font-semibold text-slate-900 dark:text-white">
            Journey
          </h3>
          <ol className="mt-2 space-y-1.5">
            {STEPS.map((step) => (
              <li
                key={step.label}
                data-j={step.n === 2 ? "vy-next" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-md py-1 pr-2 transition-shadow duration-300 data-[on=1]:shadow-[0_0_0_2px_rgba(41,116,150,0.35)]",
                  step.branch &&
                    "ml-3 border-l border-dashed border-slate-300 pl-3",
                  step.status === "locked" && "opacity-50",
                  !step.branch && "pl-1",
                )}
              >
                {step.branch ? (
                  <span className="h-2 w-2 shrink-0 rounded-full bg-slate-300" />
                ) : (
                  <StepCircle step={step} />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-slate-900 dark:text-slate-100">
                    {step.label}
                  </span>
                  <span className="block text-[11px] text-slate-500">
                    {step.sub}
                  </span>
                </span>
                {step.branch && (
                  <span className="rounded-full bg-yellow-100 px-1.5 text-[10px] font-medium text-yellow-800">
                    optional
                  </span>
                )}
                {step.status === "locked" && (
                  <IconLock className="h-3.5 w-3.5 text-slate-400" />
                )}
              </li>
            ))}
          </ol>
        </div>

        {!compact && (
          <div className="relative min-w-0 flex-1">
            <h2 className="text-3xl font-bold text-slate-900 italic dark:text-white">
              Start your Voyage
            </h2>
            <div className="relative mt-3 grid grid-cols-[1fr_auto_1fr] items-start gap-y-3">
              {/* Main path spine and the branch connector */}
              <span className="pointer-events-none absolute top-10 bottom-16 left-1/2 border-l-2 border-dashed border-[rgba(45,106,79,0.3)]" />
              <div className="col-start-2">
                <MapIsland
                  status="completed"
                  step={1}
                  label="Git Fundamentals"
                />
              </div>
              <div className="col-start-2">
                <MapIsland
                  status="available"
                  step={2}
                  label="Testing Essentials"
                />
              </div>
              <div className="relative flex items-center self-center pl-2">
                <span className="w-8 border-t-2 border-dashed border-[rgba(45,106,79,0.3)]" />
                <MapIsland status="available" small label="Debugging Basics" />
              </div>
              <div className="col-start-2">
                <MapIsland status="locked" step={3} label="Web Development" />
              </div>
            </div>
          </div>
        )}
      </div>
    </AppFrame>
  );
}
