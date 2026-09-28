import { IconSearch } from "@tabler/icons-react";
import { ArrowUpDownIcon, CheckIcon, PlusCircleIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { SAMPLE_DROPLETS } from "../journey-config";
import {
  AppFrame,
  DropletTileReplica,
  OUTLINE_SM,
  PillTabs,
  PRESSABLE,
  type PanelProps,
} from "./app-frame";

// Replica of /explore (app/(general)/explore/page.tsx). Tab counts are left
// out on purpose: they're live data.

/** Cards shown per layout; the journey animates these from their islets. */
export const EXPLORE_CARD_COUNT = { wide: 6, compact: 3 } as const;

const FILTERS = ["Focus Area", "Type", "Difficulty", "Tags"];
const FOCUS_OPTIONS = ["Personal", "Professional", "Technical"];

export function ExplorePanel({ compact }: PanelProps) {
  const cards = SAMPLE_DROPLETS.slice(
    0,
    EXPLORE_CARD_COUNT[compact ? "compact" : "wide"],
  );
  return (
    <AppFrame
      hook="panel-explore"
      url="khouryodyssey.org/explore"
      active="Explore"
      compact={compact}
    >
      <div className={compact ? "px-4 pt-4" : "px-8 pt-6"}>
        <h1 className="text-3xl leading-tight font-semibold text-black dark:text-white">
          Explore
        </h1>
        <p className="mt-1 text-sm text-[#475569] dark:text-slate-400">
          Discover Droplets, Playlists, and Voyages
        </p>

        <div className="mt-4">
          <PillTabs items={["Droplets", "Playlists", "Voyages"]} active={0} />
        </div>

        <div
          className={
            compact
              ? "mt-3 flex flex-col gap-2"
              : "mt-4 flex flex-row items-center gap-2"
          }
        >
          <div className="relative flex items-center">
            <IconSearch
              className="absolute left-3 h-4 w-4 text-[#667085]"
              stroke={1.8}
            />
            <span
              className={cn(
                "flex h-8 items-center rounded-[30px] border border-[#D0D5DD] bg-white pl-9 text-[13px] text-[#667085] dark:border-slate-600 dark:bg-slate-900",
                compact ? "w-full" : "w-[250px]",
              )}
            >
              Search...
            </span>
          </div>
          <div className="relative flex flex-1 flex-row flex-wrap items-center justify-end gap-1.5">
            {FILTERS.filter((f) => !compact || f !== "Tags").map((label) => (
              <span
                key={label}
                data-j={label === "Focus Area" ? "ex-focus-btn" : undefined}
                className={cn(OUTLINE_SM, PRESSABLE)}
              >
                <PlusCircleIcon className="h-3.5 w-3.5" />
                {label}
                {label === "Focus Area" && (
                  <span
                    data-j="ex-badge"
                    className="group ml-1 hidden items-center gap-1.5 data-[on=1]:inline-flex"
                  >
                    <span className="h-3.5 w-px bg-slate-200 dark:bg-slate-700" />
                    {/* Below lg the badge shows a count, at lg+ the label */}
                    <span className="rounded-sm bg-[hsl(240_12%_8%)] px-1 text-[11px] font-normal text-white dark:bg-white dark:text-slate-900">
                      {compact ? "1" : "Technical"}
                    </span>
                  </span>
                )}
              </span>
            ))}
            {!compact && (
              <span className={OUTLINE_SM}>
                <ArrowUpDownIcon className="h-3.5 w-3.5" />
                A-Z
              </span>
            )}

            {/* Focus Area filter popover (components/explore/filter.tsx) */}
            <div
              data-j="ex-pop"
              className={cn(
                "pointer-events-none absolute top-10 z-20 w-[180px] -translate-y-1 rounded-md border border-slate-200 bg-white opacity-0 shadow-[0_10px_30px_-10px_rgba(12,51,84,0.35)] transition-[opacity,transform] duration-200 data-[on=1]:translate-y-0 data-[on=1]:opacity-100 dark:border-slate-700 dark:bg-slate-900",
                compact ? "left-0" : "right-[210px]",
              )}
            >
              <div className="border-b border-slate-100 px-3 py-2 text-[13px] text-slate-400 dark:border-slate-800">
                Focus Area
              </div>
              <ul className="p-1">
                {FOCUS_OPTIONS.map((option) => (
                  <li
                    key={option}
                    className="flex items-center rounded-sm px-2 py-1.5 text-[13px] text-slate-800 dark:text-slate-200"
                  >
                    <span
                      data-j={option === "Technical" ? "ex-check" : undefined}
                      className="mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-sky-600 opacity-50 transition-colors duration-200 data-[on=1]:bg-sky-600 data-[on=1]:text-white data-[on=1]:opacity-100 [&[data-on='1']>svg]:visible"
                    >
                      <CheckIcon className="invisible h-3 w-3" />
                    </span>
                    {option}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <ul
        data-j="ex-grid"
        className={
          compact
            ? "mt-4 grid grid-cols-1 gap-3 px-4"
            : "mt-5 grid grid-cols-3 gap-3 px-8"
        }
      >
        {cards.map((droplet, i) => (
          <DropletTileReplica
            key={droplet.title}
            droplet={droplet}
            hook={`ex-card-${i}`}
            className="will-change-transform"
          />
        ))}
      </ul>
    </AppFrame>
  );
}
