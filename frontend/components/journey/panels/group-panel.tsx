import { cn, getDueDateBadgeColor } from "@/lib/utils";
import { Clock, Droplet, ListVideo, Pencil } from "lucide-react";
import { IconFileSpreadsheet } from "@tabler/icons-react";
import { SAMPLE_DROPLETS, SAMPLE_GROUP } from "../journey-config";
import {
  AppFrame,
  DifficultyPill,
  PillTabs,
  TagPill,
  type PanelProps,
} from "./app-frame";

// Replica of a group page as its creator sees it (app/(groups)/g/[slug]):
// group-header.tsx, due-date-announcements.tsx, group-droplet-tile.tsx and
// the Progress tab (group-progress-grid.tsx). Member names in the Progress
// table are drawn as placeholders rather than invented people.

const DUE = [
  { name: "Git Fundamentals", days: 3, Icon: Droplet },
  { name: "Intro to Databases", days: 10, Icon: Droplet },
  { name: "Testing Essentials", days: 17, Icon: ListVideo },
];

const PROGRESS = [
  [100, 60],
  [100, 100],
  [40, 0],
  [100, 20],
];

const barColor = (pct: number) =>
  pct === 100 ? "bg-emerald-500" : pct > 33 ? "bg-amber-400" : "bg-red-400";

function GroupDropletTile({
  index,
  due,
  days,
}: {
  index: number;
  due: string;
  days: number;
}) {
  const d = SAMPLE_DROPLETS[index];
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-600 dark:bg-slate-800">
      <div className="flex flex-wrap gap-1">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]",
            getDueDateBadgeColor(days, true),
          )}
        >
          <Clock size={12} />
          {due}
        </span>
        <TagPill value={d.focusArea} />
        <TagPill value={d.type} />
        <DifficultyPill value={d.difficulty} />
      </div>
      <p className="mt-2 text-lg leading-tight font-black text-slate-950 dark:text-slate-200">
        {d.title}
      </p>
      <p className="mt-1 text-[12px] text-slate-500">4 lessons</p>
    </div>
  );
}

export function GroupPanel({ compact }: PanelProps) {
  return (
    <AppFrame
      hook="panel-group"
      url="khouryodyssey.org/g/co-op-prep"
      compact={compact}
    >
      <div className={cn("h-full", compact ? "px-4 pt-4" : "px-8 pt-5")}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {SAMPLE_GROUP.name}
            </h1>
            <span className="rounded-full border border-slate-300 px-2.5 py-0.5 text-[12px] font-semibold text-slate-700 dark:border-slate-600 dark:text-slate-300">
              {SAMPLE_GROUP.semester}
            </span>
          </div>
          {/* Editors always see both buttons (group-header.tsx) */}
          <div className="flex gap-2">
            {[
              { label: "Edit Group", Icon: Pencil },
              { label: "Due Dates", Icon: Clock },
            ].map(({ label, Icon }) => (
              <span
                key={label}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                <Icon size={14} />
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className={cn("mt-5 grid gap-6", !compact && "grid-cols-3")}>
          {!compact && (
            <div>
              <h2 className="mb-2 text-base font-semibold text-slate-900 dark:text-white">
                Group Details
              </h2>
              <div className="rounded-md border border-slate-200 p-3 text-[13px] dark:border-slate-700">
                <p className="text-slate-500">Semester</p>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {SAMPLE_GROUP.semester}
                </p>
              </div>
            </div>
          )}

          <div className={cn(!compact && "col-span-2")}>
            {!compact && (
              <>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Group Description
                </h2>
                <p className="mt-1 mb-4 text-[13px] leading-5 text-slate-600 dark:text-slate-400">
                  Droplets and Voyages to finish before your co-op search.
                </p>
              </>
            )}
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Upcoming Due Dates
            </h2>
            <ul className="mt-2 space-y-1.5 text-[13px] text-slate-700 dark:text-slate-300">
              {DUE.map(({ name, days, Icon }, i) => (
                <li
                  key={name}
                  data-j={`gr-due-${i}`}
                  className="flex translate-y-1 items-center gap-2 opacity-0 transition-[opacity,transform] duration-300 data-[on=1]:translate-y-0 data-[on=1]:opacity-100"
                >
                  <Icon size={15} className="text-[#2D7597]" />
                  <span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {name}
                    </span>{" "}
                    is due in {days} days!
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-4">
              <PillTabs
                items={["Droplets", "Playlists", "Voyages", "Progress"]}
                active={0}
                hookPrefix="gr-tab"
              />
            </div>

            <div className="relative mt-3">
              <div
                data-j="gr-view-droplets"
                className={cn(
                  "grid gap-3 transition-opacity duration-300 data-[on=0]:opacity-0",
                  !compact && "grid-cols-2",
                )}
              >
                <GroupDropletTile index={0} due="Due 10/02 11:59 PM" days={3} />
                {!compact && (
                  <GroupDropletTile
                    index={2}
                    due="Due 10/09 11:59 PM"
                    days={10}
                  />
                )}
              </div>

              <div
                data-j="gr-view-progress"
                className="absolute inset-x-0 top-0 opacity-0 transition-opacity duration-300 data-[on=1]:opacity-100"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-md border border-slate-200 px-2.5 py-1 text-[12px] text-slate-700 dark:border-slate-700 dark:text-slate-300">
                    Droplets — All
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-[12px] text-slate-700 dark:border-slate-700 dark:text-slate-300">
                    <IconFileSpreadsheet className="h-3.5 w-3.5" />
                    Export
                  </span>
                </div>
                <table className="mt-2 w-full text-left text-[12px]">
                  <thead className="text-slate-500">
                    <tr>
                      <th className="py-1 font-medium">Member</th>
                      <th className="py-1 font-medium">Git Fundamentals</th>
                      {!compact && (
                        <th className="py-1 font-medium">Intro to Databases</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {PROGRESS.map((row, i) => (
                      <tr
                        key={i}
                        className="border-t border-slate-100 dark:border-slate-800"
                      >
                        <td className="py-1.5">
                          <span className="block h-2 w-20 rounded-full bg-slate-200 dark:bg-slate-700" />
                          <span className="mt-1 block h-1.5 w-28 rounded-full bg-slate-100 dark:bg-slate-800" />
                        </td>
                        {row.slice(0, compact ? 1 : 2).map((pct, j) => (
                          <td key={j} className="py-1.5 pr-3">
                            <span className="text-slate-700 dark:text-slate-300">
                              {pct}%
                            </span>
                            <span className="mt-0.5 block h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                              <span
                                className={cn(
                                  "block h-2 rounded-full",
                                  barColor(pct),
                                )}
                                style={{ width: `${Math.max(pct, 4)}%` }}
                              />
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppFrame>
  );
}
