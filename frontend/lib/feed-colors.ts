import { AnnouncementType } from "@/types";
import { AnnouncementTypeTitle } from "@/lib/globals";

type FeedColor = {
  // Pill when active
  pillActive: string;
  // Pill when inactive (keeps the type's hue, muted)
  pillInactive: string;
  // Feed block card (border + subtle background + icon/label text)
  card: string;
  accent: string;
};

export const FEED_COLORS: Record<AnnouncementType, FeedColor> = {
  system: {
    pillActive:
      "border-slate-700 bg-white text-slate-700 dark:border-slate-200 dark:bg-slate-900 dark:text-slate-200",
    pillInactive:
      "border-slate-200 bg-white text-slate-700 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200",
    card: "border-slate-400 bg-slate-500/5 dark:border-slate-600 dark:bg-slate-500/10",
    accent: "text-slate-600 dark:text-slate-300",
  },
  droplet: {
    pillActive:
      "border-sky-700 bg-white text-sky-700 dark:border-sky-300 dark:bg-slate-900 dark:text-sky-300",
    pillInactive:
      "border-slate-200 bg-white text-sky-700 hover:border-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-sky-300",
    card: "border-sky-500 bg-sky-500/5 dark:border-sky-700 dark:bg-sky-500/10",
    accent: "text-sky-700 dark:text-sky-300",
  },
  playlist: {
    pillActive:
      "border-emerald-700 bg-white text-emerald-700 dark:border-emerald-300 dark:bg-slate-900 dark:text-emerald-300",
    pillInactive:
      "border-slate-200 bg-white text-emerald-700 hover:border-emerald-400 dark:border-slate-700 dark:bg-slate-900 dark:text-emerald-300",
    card: "border-emerald-500 bg-emerald-500/5 dark:border-emerald-700 dark:bg-emerald-500/10",
    accent: "text-emerald-700 dark:text-emerald-300",
  },
  group: {
    pillActive:
      "border-purple-700 bg-white text-purple-700 dark:border-purple-300 dark:bg-slate-900 dark:text-purple-300",
    pillInactive:
      "border-slate-200 bg-white text-purple-700 hover:border-purple-400 dark:border-slate-700 dark:bg-slate-900 dark:text-purple-300",
    card: "border-purple-500 bg-purple-500/5 dark:border-purple-700 dark:bg-purple-500/10",
    accent: "text-purple-700 dark:text-purple-300",
  },
  friend: {
    pillActive:
      "border-amber-700 bg-white text-amber-700 dark:border-amber-300 dark:bg-slate-900 dark:text-amber-300",
    pillInactive:
      "border-slate-200 bg-white text-amber-700 hover:border-amber-400 dark:border-slate-700 dark:bg-slate-900 dark:text-amber-300",
    card: "border-amber-500 bg-amber-500/5 dark:border-amber-700 dark:bg-amber-500/10",
    accent: "text-amber-700 dark:text-amber-300",
  },
  kudos: {
    pillActive:
      "border-fuchsia-700 bg-white text-fuchsia-700 dark:border-fuchsia-300 dark:bg-slate-900 dark:text-fuchsia-300",
    pillInactive:
      "border-slate-200 bg-white text-fuchsia-700 hover:border-fuchsia-400 dark:border-slate-700 dark:bg-slate-900 dark:text-fuchsia-300",
    card: "border-fuchsia-500 bg-fuchsia-500/5 dark:border-fuchsia-700 dark:bg-fuchsia-500/10",
    accent: "text-fuchsia-700 dark:text-fuchsia-300",
  },
};

export function feedColorFor(type: AnnouncementType | AnnouncementTypeTitle) {
  const key = (
    typeof type === "string" ? type : (type as string)
  ).toLowerCase() as AnnouncementType;
  return FEED_COLORS[key] ?? FEED_COLORS.system;
}
