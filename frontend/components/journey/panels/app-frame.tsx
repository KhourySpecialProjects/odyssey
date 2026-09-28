import { Logo } from "@/components/header/logo";
import { getTagColors } from "@/lib/tag-colors";
import { cn, getDifficultyBadgeColor } from "@/lib/utils";
import { IconHeart, IconMenu2 } from "@tabler/icons-react";
import {
  SAMPLE_PEOPLE,
  type Difficulty,
  type SampleDroplet,
} from "../journey-config";

// Presentational replicas of Odyssey UI, styled with the same classes as the
// real components they mirror. They're static and aria-hidden: the journey's
// captions carry the meaning for assistive tech.

/** Design size of a panel before it's scaled to fit the stage. */
export const PANEL_SIZE = {
  wide: { w: 880, h: 600 },
  compact: { w: 360, h: 480 },
} as const;

export type PanelProps = { compact: boolean };

type NavLabel = "Activity" | "Explore" | "Groups" | "Create";

// The signed-in main nav (config/general.ts); "Create" is shown to every
// signed-in user, either as My Content or as the creation request form.
const NAV: NavLabel[] = ["Activity", "Explore", "Groups", "Create"];

/** Browser chrome plus the Odyssey header (components/header/index.tsx). */
export function AppFrame({
  hook,
  url,
  active,
  compact,
  className,
  children,
}: {
  hook: string;
  url: string;
  active?: NavLabel;
  compact: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const size = PANEL_SIZE[compact ? "compact" : "wide"];
  return (
    <div
      data-j={hook}
      className="absolute top-0 left-0 origin-top-left opacity-0"
      style={{ width: size.w, height: size.h }}
    >
      {/* Revealed with a clip-path mask, separate from the content so cards
          can fly in from the map without being clipped. */}
      <div
        data-j={`${hook}-surface`}
        className="absolute inset-0 rounded-xl border border-slate-200 bg-white shadow-[0_0_0_1px_rgba(15,23,42,0.02),0_24px_60px_-12px_rgba(12,51,84,0.28),0_2px_6px_rgba(12,51,84,0.08)] dark:border-slate-700 dark:bg-slate-900"
      />
      <div
        data-j={`${hook}-content`}
        className={cn(
          "relative flex h-full flex-col overflow-hidden rounded-xl",
          className,
        )}
      >
        <div className="flex h-8 shrink-0 items-center gap-3 border-b border-slate-200 bg-slate-50 px-3 dark:border-slate-700 dark:bg-slate-800">
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-600"
              />
            ))}
          </div>
          <div
            data-j={`${hook}-url`}
            className="mx-auto max-w-[70%] truncate rounded-md bg-white px-3 py-0.5 text-[11px] text-slate-500 dark:bg-slate-900 dark:text-slate-400"
          >
            {url}
          </div>
          <div className="w-[42px]" />
        </div>

        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-2 dark:border-slate-500 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            {compact && (
              <span className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 dark:border-slate-700">
                <IconMenu2 className="h-4 w-4" />
              </span>
            )}
            <Logo width={96} height={30} />
          </div>
          {!compact && (
            <ul className="flex gap-7 text-sm">
              {NAV.map((label) => (
                <li
                  key={label}
                  data-j={`${hook}-nav-${label}`}
                  data-on={label === active ? "1" : "0"}
                  className="text-slate-900 data-[on=1]:font-bold data-[on=1]:text-sky-700 dark:text-white dark:data-[on=1]:text-sky-500"
                >
                  {label}
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-center gap-2 text-sm text-slate-900 dark:text-white">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-100 text-xs font-semibold text-sky-800">
              {SAMPLE_PEOPLE.learnerInitials}
            </span>
            {!compact && (
              <span>
                Hi, <span className="font-bold">{SAMPLE_PEOPLE.learner}</span>!
              </span>
            )}
          </div>
        </div>

        <div className="relative min-h-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Tag-style pill (components/droplets/droplet-tile.tsx, lib/tag-colors.ts). */
export function TagPill({ value }: { value: string }) {
  const color = getTagColors(value);
  return (
    <span
      className={cn(
        "rounded-[16px] px-[9px] py-[3px] text-[12px] leading-[16px] font-medium whitespace-nowrap",
        color.bg,
        color.text,
      )}
    >
      {capitalize(value)}
    </span>
  );
}

export function DifficultyPill({ value }: { value: Difficulty }) {
  return (
    <span
      className={cn(
        "rounded-[16px] px-[9px] py-[3px] text-[12px] leading-[16px] font-medium",
        getDifficultyBadgeColor(value),
      )}
    >
      {capitalize(value)}
    </span>
  );
}

const COMPLETE_COLORS = (pct: number) =>
  pct === 0
    ? "border-red-400 text-red-600"
    : pct < 100
      ? "border-amber-400 text-amber-600"
      : "border-emerald-400 text-emerald-600";

/** The "N% Complete" pill shown on enrolled droplet tiles. */
export function CompletePill({ pct }: { pct: number }) {
  return (
    <span
      className={cn(
        "rounded-[16px] border bg-white px-[9px] py-[3px] text-[12px] leading-[16px] font-medium dark:bg-slate-900",
        COMPLETE_COLORS(pct),
      )}
    >
      {pct}% Complete
    </span>
  );
}

/** Replica of DropletTile (components/droplets/droplet-tile.tsx). */
export function DropletTileReplica({
  droplet,
  hook,
  percent,
  draft,
  className,
}: {
  droplet: SampleDroplet;
  hook?: string;
  percent?: number;
  draft?: boolean;
  className?: string;
}) {
  return (
    <li
      data-j={hook}
      className={cn(
        "list-none overflow-hidden rounded-lg border border-[#D0D5DD] bg-[#fcfcfd] p-1.5 transition-[box-shadow,border-color] duration-300 data-[on=1]:border-[#2D7597] data-[on=1]:shadow-[0_0_0_3px_rgba(45,117,151,0.25)] dark:border-slate-500 dark:bg-slate-800",
        className,
      )}
    >
      <div className="flex h-full flex-col justify-between gap-2 p-3">
        <div className="flex flex-col gap-2">
          <div className="flex flex-row flex-wrap gap-1">
            {draft && (
              <span className="inline-flex items-center rounded-[16px] bg-slate-200 px-[9px] py-[3px] text-[12px] leading-[16px] font-medium text-slate-600 opacity-90">
                Draft
              </span>
            )}
            {percent !== undefined && <CompletePill pct={percent} />}
            <TagPill value={droplet.focusArea} />
            <TagPill value={droplet.type} />
            {droplet.tags.map((t) => (
              <TagPill key={t} value={t} />
            ))}
            <DifficultyPill value={droplet.difficulty} />
          </div>
          <span className="block text-xl leading-tight font-black text-slate-950 dark:text-slate-300">
            {droplet.title}
          </span>
          <p className="line-clamp-2 text-[13px] leading-snug text-slate-700 dark:text-slate-400">
            {droplet.description}
          </p>
        </div>
        <div className="flex justify-end">
          <IconHeart className="h-4 w-4 text-black dark:text-slate-300" />
        </div>
      </div>
    </li>
  );
}

/** Rounded pill tabs (components/explore/content-type-selector.tsx). */
export function PillTabs({
  items,
  active,
  hookPrefix,
}: {
  items: string[];
  active: number;
  hookPrefix?: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((label, i) => (
        <span
          key={label}
          data-j={hookPrefix ? `${hookPrefix}-${i}` : undefined}
          data-on={i === active ? "1" : "0"}
          className="rounded-full border border-[#D0D5DD] px-3.5 py-1 text-[13px] font-medium text-[#667085] transition-colors duration-300 data-[on=1]:border-[#287697] data-[on=1]:bg-[#287697] data-[on=1]:text-white dark:border-slate-600 dark:text-slate-400"
        >
          {label}
        </span>
      ))}
    </div>
  );
}

/** Outline "sm" button (components/ui/button.tsx, variant outline). */
export const OUTLINE_SM =
  "inline-flex h-8 items-center gap-1.5 rounded-md border border-[#D0D5DD] bg-white px-2.5 text-[13px] font-medium text-[#667085] whitespace-nowrap dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300";

/** Primary teal button (components/droplets/enroll-button.tsx). */
export const PRIMARY =
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[#2D7597] bg-[#2D7597] px-3.5 text-[13px] font-medium text-white shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] whitespace-nowrap";

/** Secondary white button used for Previous / Next. */
export const SECONDARY =
  "inline-flex h-9 items-center gap-2 rounded-[8px] border border-[#d0d5dd] bg-white px-3 text-[13px] font-medium text-[#344054] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] whitespace-nowrap dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200";

/** Pressed feedback for a replica control the story "clicks". */
export const PRESSABLE =
  "transition-[transform,box-shadow] duration-200 data-[press=1]:scale-95 data-[press=1]:shadow-[0_0_0_4px_rgba(45,117,151,0.3)]";
