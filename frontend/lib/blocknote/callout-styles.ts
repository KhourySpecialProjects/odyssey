import {
  TriangleAlert,
  CircleHelp,
  CircleAlert,
  BookOpenText,
  BadgeInfo,
  Bell,
  Pin,
} from "lucide-react";
import type { CalloutType } from "@/lib/blocknote/types";

/**
 * Single source of truth for how a callout looks, used by the creator's
 * BlockNote block, the lesson reader and present mode.
 */
export const CALLOUT_STYLES = {
  warning: { bg: "#FFCCCB", icon: TriangleAlert, title: "Warning" },
  question: { bg: "#BBE5FF", icon: CircleHelp, title: "Question" },
  important: { bg: "#FFD4A3", icon: CircleAlert, title: "Important" },
  definition: { bg: "#C8E6C9", icon: BookOpenText, title: "Definition" },
  "more-information": {
    bg: "#E1BEE7",
    icon: BadgeInfo,
    title: "More Information",
  },
  caution: { bg: "#FFF59D", icon: Bell, title: "Caution" },
  default: { bg: "#EEEEEE", icon: Pin, title: "Default" },
} as const satisfies Record<
  CalloutType,
  { bg: string; icon: typeof Pin; title: string }
>;

export const CALLOUT_TYPES = Object.keys(CALLOUT_STYLES) as CalloutType[];

export function isCalloutType(value: unknown): value is CalloutType {
  return typeof value === "string" && Object.hasOwn(CALLOUT_STYLES, value);
}

/** Layout shared by the editor block and the readers (real Tailwind 3.4 classes). */
export const CALLOUT_CONTAINER_CLASS =
  "flex w-full min-w-[200px] items-center gap-3 rounded p-4";
export const CALLOUT_ICON_CLASS = "text-slate-800 dark:text-slate-900";
export const CALLOUT_TEXT_CLASS = "text-slate-900 dark:text-slate-900";
