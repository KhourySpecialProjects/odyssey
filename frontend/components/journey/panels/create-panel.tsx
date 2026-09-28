import { cn } from "@/lib/utils";
import {
  IconArrowLeft,
  IconCheck,
  IconGripVertical,
  IconHelpCircle,
  IconLayoutSidebarLeftCollapse,
  IconPlus,
  IconPresentation,
  IconSearch,
  IconTrash,
  IconUpload,
} from "@tabler/icons-react";
import { ArrowUpDownIcon, PlusCircleIcon } from "lucide-react";
import { SAMPLE_AUTHORED, SAMPLE_NEW_DROPLET } from "../journey-config";
import {
  AppFrame,
  DropletTileReplica,
  OUTLINE_SM,
  PillTabs,
  PRESSABLE,
  PRIMARY,
  type PanelProps,
} from "./app-frame";

// Replica of /my-content and the droplet draft editor (/draft/d/[slug]):
// components/my-content/*, components/draft/sidebar.tsx, and the BlockNote
// slash menu (components/ui/blocknote/editor/slash-menu-config.ts).

// What the slash menu lists after typing "/quiz".
const SLASH_GROUPS = [
  {
    label: "Quizzes",
    items: ["True/False Quiz", "Open-Ended Quiz", "Multiple Choice Quiz"],
  },
];

export function CreatePanel({ compact }: PanelProps) {
  return (
    <AppFrame
      hook="panel-create"
      url="khouryodyssey.org/my-content"
      active="Create"
      compact={compact}
    >
      {/* My Content */}
      <div
        data-j="cr-view-mine"
        className={cn("absolute inset-0", compact ? "px-4 pt-4" : "px-8 pt-6")}
      >
        <h1 className="text-3xl leading-tight font-semibold text-black dark:text-white">
          My Content
        </h1>
        <p className="mt-1 text-sm text-[#475569] dark:text-slate-400">
          Create a new Droplet, Playlist, or Voyage draft
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          {/* A Content Creator's tabs; Voyages is only shown to Faculty and
              System Admins (my-content/page.tsx). */}
          <PillTabs items={["Droplets", "Playlists"]} active={0} />
          <span
            data-j="cr-new"
            className={cn(
              "inline-flex h-8 items-center gap-2 rounded-md bg-[#287697] px-3 text-[13px] font-medium text-white",
              PRESSABLE,
            )}
          >
            New Droplet <IconPlus className="h-4 w-4" />
          </span>
        </div>
        {!compact && (
          <div className="mt-4 flex items-center gap-2">
            <span className="relative flex items-center">
              <IconSearch className="absolute left-3 h-4 w-4 text-[#667085]" />
              <span className="flex h-8 w-[200px] items-center rounded-[30px] border border-[#D0D5DD] bg-white pl-9 text-[13px] text-[#667085] dark:border-slate-600 dark:bg-slate-900">
                Search...
              </span>
            </span>
            <span className="ml-auto flex gap-1.5">
              {["Status", "Focus Area", "Type"].map((f) => (
                <span key={f} className={OUTLINE_SM}>
                  <PlusCircleIcon className="h-3.5 w-3.5" />
                  {f}
                </span>
              ))}
              <span className={OUTLINE_SM}>
                <ArrowUpDownIcon className="h-3.5 w-3.5" />
                Recently Updated
              </span>
            </span>
          </div>
        )}
        <ul
          className={cn(
            "mt-5 grid gap-3",
            compact ? "grid-cols-1" : "grid-cols-3",
          )}
        >
          <DropletTileReplica droplet={SAMPLE_AUTHORED[1]} draft />
          {!compact && <DropletTileReplica droplet={SAMPLE_AUTHORED[0]} />}
        </ul>
      </div>

      {/* Draft editor */}
      <div data-j="cr-view-draft" className="absolute inset-0 flex opacity-0">
        {!compact && (
          <aside className="flex w-[210px] shrink-0 flex-col border-r border-[#D0D5DD] bg-[#FCFCFD] py-3 text-[13px] dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center gap-3 px-4 text-slate-500">
              <IconArrowLeft className="h-4 w-4" />
              <IconPresentation className="h-4 w-4" />
              <IconHelpCircle className="h-4 w-4" />
              <IconLayoutSidebarLeftCollapse className="ml-auto h-4 w-4" />
            </div>
            <div className="mt-4 px-4 pb-2 text-lg leading-6 font-extrabold text-slate-900 dark:text-white">
              {SAMPLE_NEW_DROPLET}
            </div>
            <div className="flex flex-col gap-0.5 px-2 text-[#344054] dark:text-slate-300">
              <div className="flex items-center gap-3 rounded-xl px-3 py-2">
                <IconSearch className="h-4 w-4" />
                Overview
              </div>
              <div className="mt-2 flex items-center justify-between px-3 text-[12px] font-semibold text-slate-500">
                Lessons
                <span className="flex gap-2">
                  <IconUpload className="h-3.5 w-3.5" />
                  <IconPlus className="h-3.5 w-3.5" />
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-[#287697]/10 px-3 py-2 text-[#287697]">
                <IconGripVertical className="h-3.5 w-3.5" />
                Why Test?
              </div>
              <div
                data-j="cr-lesson-2"
                className="flex -translate-x-2 items-center gap-2 rounded-xl px-3 py-2 opacity-0 transition-[opacity,transform] duration-300 data-[on=1]:translate-x-0 data-[on=1]:opacity-100"
              >
                <IconGripVertical className="h-3.5 w-3.5" />
                Writing Your First Test
              </div>
            </div>
            <div className="mt-auto space-y-2 px-3">
              <div className="flex items-center justify-between text-[12px] text-slate-600 dark:text-slate-300">
                Presentation
                {/* Off by default for a new droplet */}
                <span className="flex h-4 w-7 items-center rounded-full bg-slate-300 px-0.5 dark:bg-slate-600">
                  <span className="h-3 w-3 rounded-full bg-white" />
                </span>
              </div>
              <span className="flex h-9 items-center justify-center rounded-lg border border-[#D0D5DD] bg-white text-[13px] font-medium text-[#344054] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">
                Preview
              </span>
              <span className={cn(PRIMARY, "flex w-full")}>Review</span>
            </div>
          </aside>
        )}
        <div
          className={cn(
            "relative min-w-0 flex-1 bg-white dark:bg-slate-900",
            compact ? "px-5 pt-5" : "px-10 pt-6",
          )}
        >
          <h2 className="text-[28px] leading-tight font-bold text-slate-900 dark:text-white">
            Why Test?
          </h2>
          <p className="mt-1 text-[12px] text-slate-500">
            Changes saved automatically
          </p>
          <p className="mt-5 text-[15px] leading-7 text-slate-700 dark:text-slate-300">
            Tests catch bugs before your users do. In this lesson you’ll write a
            test, run it, and read the results.
          </p>
          <div className="relative mt-2">
            <p
              data-j="cr-slash-line"
              className="h-7 text-[15px] leading-7 text-slate-700 data-[on=0]:invisible dark:text-slate-300"
            >
              /quiz
            </p>
            {/* Slash menu */}
            <div
              data-j="cr-slash"
              className="absolute top-8 left-0 z-10 w-[230px] translate-y-1 rounded-md border border-slate-200 bg-white p-1.5 opacity-0 shadow-[0_12px_32px_-10px_rgba(12,51,84,0.4)] transition-[opacity,transform] duration-200 data-[on=1]:translate-y-0 data-[on=1]:opacity-100 dark:border-slate-700 dark:bg-slate-800"
            >
              {SLASH_GROUPS.map((group) => (
                <div key={group.label}>
                  <div className="px-2 pt-1.5 pb-1 text-[11px] font-semibold text-slate-400">
                    {group.label}
                  </div>
                  {group.items.map((item) => (
                    <div
                      key={item}
                      data-j={
                        item === "Multiple Choice Quiz" ? "cr-mc" : undefined
                      }
                      className="rounded px-2 py-1.5 text-[13px] text-slate-800 transition-colors duration-200 data-[on=1]:bg-slate-100 dark:text-slate-200 dark:data-[on=1]:bg-slate-700"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            {/* Inserted block (components/ui/blocknote/blocks/quiz-multiple-choice-block.tsx) */}
            <div
              data-j="cr-quiz"
              className="absolute top-0 left-0 w-full max-w-[440px] translate-y-2 rounded-lg border-2 border-gray-200 bg-white pb-3 opacity-0 transition-[opacity,transform] duration-300 data-[on=1]:translate-y-0 data-[on=1]:opacity-100 dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="flex items-center justify-between p-3">
                <span className="text-sm font-semibold tracking-wide text-black dark:text-white">
                  Multiple Choice Quiz
                </span>
                <IconTrash className="h-4 w-4 text-red-600" />
              </div>
              <div className="space-y-3 px-3 text-[12px]">
                <div>
                  <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                    Question:
                  </span>
                  <span className="block h-8 rounded-md border border-gray-200 dark:border-gray-600" />
                </div>
                <div>
                  <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                    Answer Options:
                  </span>
                  {[0, 1].map((i) => (
                    <div key={i} className="mt-1.5 flex items-center gap-2">
                      {/* A new block starts with its first option marked correct */}
                      <span
                        className={cn(
                          "flex h-4 w-4 items-center justify-center rounded-sm border",
                          i === 0
                            ? "border-[#2D7597] bg-[#2D7597] text-white"
                            : "border-gray-400",
                        )}
                      >
                        {i === 0 && <IconCheck className="h-3 w-3" />}
                      </span>
                      <span className="block h-7 flex-1 rounded-md border border-gray-200 dark:border-gray-600" />
                    </div>
                  ))}
                  <span className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 dark:border-gray-600">
                    <IconPlus className="h-3.5 w-3.5" />
                    Add Option
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppFrame>
  );
}
