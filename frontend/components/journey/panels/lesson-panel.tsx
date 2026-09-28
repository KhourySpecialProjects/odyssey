import { cn } from "@/lib/utils";
import {
  IconArrowLeft,
  IconArrowRight,
  IconChevronUp,
  IconGripVertical,
  IconHelpCircle,
  IconHighlight,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconListCheck,
  IconLock,
  IconNotebook,
  IconNotes,
  IconPlus,
  IconPresentation,
  IconSearch,
  IconStar,
  IconTarget,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { SAMPLE_LESSONS } from "../journey-config";
import { seeded } from "../journey-math";
import {
  AppFrame,
  PRESSABLE,
  PRIMARY,
  SECONDARY,
  type PanelProps,
} from "./app-frame";

// Replica of the droplet lesson viewer (/d/[slug]/[lessonSlug]) and its
// Recap page, from components/droplets/*. The sidebar collapses below xl in
// the real app, so the compact layout shows the collapsed state.

const HIGHLIGHT_COLORS = [
  "#f9a8d4",
  "#fbd38d",
  "#fff300",
  "#86efac",
  "#93c5fd",
];

const CONFETTI = (() => {
  const rand = seeded(9);
  return Array.from({ length: 36 }, (_, i) => {
    const a = (i / 36) * Math.PI * 2 + rand() * 0.3;
    const d = 120 + rand() * 170;
    return {
      x: Math.round(Math.cos(a) * d),
      y: Math.round(Math.sin(a) * d),
      size: 5 + Math.round(rand() * 5),
    };
  });
})();

function SidebarRow({
  hook,
  icon,
  label,
  lesson,
}: {
  hook?: string;
  icon?: React.ReactNode;
  label: string;
  lesson?: boolean;
}) {
  return (
    <div
      data-j={hook}
      data-state="open"
      className="group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[#344054] transition-[background-color,color,opacity] duration-300 data-[state=active]:bg-[#287697]/10 data-[state=active]:text-[#287697] data-[state=locked]:opacity-50 dark:text-slate-300"
    >
      {lesson ? (
        <span className="ml-1 h-4 w-px rounded-full bg-slate-300 transition-colors group-data-[state=active]:bg-[#287697]" />
      ) : (
        icon
      )}
      <span className="truncate">{label}</span>
      {lesson && (
        <IconLock className="ml-auto hidden h-3.5 w-3.5 shrink-0 text-slate-400 group-data-[state=locked]:block" />
      )}
    </div>
  );
}

export function LessonPanel({ compact }: PanelProps) {
  return (
    <AppFrame
      hook="panel-lesson"
      url="khouryodyssey.org/d/git-fundamentals/what-is-version-control"
      compact={compact}
    >
      <div className="flex h-full">
        {!compact && (
          <aside className="flex w-[210px] shrink-0 flex-col border-r border-[#D0D5DD] bg-[#FCFCFD] py-3 text-[13px] dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center gap-3 px-4 text-slate-500">
              <IconArrowLeft className="h-4 w-4" />
              <IconPresentation className="h-4 w-4" />
              <IconLayoutSidebarLeftCollapse className="ml-auto h-4 w-4" />
            </div>
            <div className="mt-4 px-4 pb-2 text-lg leading-6 font-extrabold text-slate-900 dark:text-white">
              Git Fundamentals
            </div>
            <div className="flex flex-col gap-0.5 px-2">
              <SidebarRow
                icon={<IconSearch className="h-4 w-4" />}
                label="Overview"
              />
              {SAMPLE_LESSONS.map((name, i) => (
                <SidebarRow
                  key={name}
                  hook={`ls-row-${i}`}
                  label={name}
                  lesson
                />
              ))}
              <SidebarRow
                hook="ls-row-recap"
                icon={<IconListCheck className="h-4 w-4" />}
                label="Recap"
              />
            </div>
            <div className="mt-auto border-t border-t-slate-200 bg-slate-50 p-2 dark:border-t-slate-700 dark:bg-slate-800">
              <div
                data-j="ls-pct"
                className="text-[13px] leading-none font-medium text-slate-900 dark:text-slate-200"
              >
                0% complete
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full border border-[#D0D5DD] bg-slate-100 dark:bg-slate-700">
                <div
                  data-j="ls-bar"
                  className="h-full origin-left scale-x-0 bg-[#2D7597] transition-transform duration-500"
                />
              </div>
            </div>
          </aside>
        )}

        <div className="relative min-w-0 flex-1 overflow-hidden bg-white dark:bg-slate-900">
          {compact && (
            <span className="absolute top-3 left-3 z-10 flex h-8 w-8 items-center justify-center rounded-md bg-white shadow-md dark:bg-slate-800">
              <IconLayoutSidebarLeftExpand className="h-4 w-4 text-slate-600" />
            </span>
          )}
          {/* Lesson view */}
          <div
            data-j="ls-view-lesson"
            className="absolute inset-0 flex flex-col"
          >
            {/* Help and notes buttons only appear on lesson pages
                (components/droplets/lessons/highlight-dropdown.tsx). */}
            <div className="absolute top-3 right-4 z-10 flex flex-col gap-2">
              {[IconHelpCircle, IconNotes].map((Icon, i) => (
                <span
                  key={i}
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-[#2D7597] bg-[#2D7597] text-white"
                >
                  <Icon className="h-4 w-4" />
                </span>
              ))}
            </div>
            <div className="relative min-h-0 flex-1 overflow-hidden">
              <div
                data-j="ls-scroll"
                className={cn(
                  "will-change-transform",
                  compact ? "px-5 pt-14 pb-8" : "px-10 pt-6 pb-10",
                )}
              >
                <h2 className="pr-10 text-[28px] leading-tight font-bold text-slate-900 dark:text-white">
                  {SAMPLE_LESSONS[0]}
                </h2>
                <div
                  data-j="ls-hint"
                  className="mt-4 flex items-center gap-3 rounded-lg border border-[#2D7597]/20 bg-[#2D7597]/5 px-3 py-2 text-[13px] text-[#2D7597] transition-opacity duration-300 data-[on=0]:opacity-0"
                >
                  <IconHighlight className="h-4 w-4 shrink-0" />
                  Select any text to highlight it, take notes, or save quotes.
                  <IconX className="ml-auto h-3.5 w-3.5 shrink-0" />
                </div>
                <div className="mt-5 space-y-3 text-[15px] leading-7 text-slate-700 dark:text-slate-300">
                  <p>
                    Version control records every change to your files, so you
                    can review your history and undo mistakes.
                  </p>
                  <p className="relative">
                    Git saves your work as a series of commits.{" "}
                    <span
                      data-j="ls-hl"
                      data-state="none"
                      className="rounded-[8px] transition-colors duration-300 data-[state=highlighted]:bg-[#fff300] data-[state=highlighted]:text-black data-[state=selected]:bg-[rgb(0,120,215)] data-[state=selected]:text-white"
                    >
                      A commit is a snapshot of your project at a moment in
                      time.
                    </span>{" "}
                    Each one has a message explaining what changed.
                    {/* Selection toolbar (components/droplets/lessons/selection-toolbar.tsx) */}
                    <span
                      data-j="ls-toolbar"
                      className="absolute -top-9 left-40 flex -translate-y-1 items-center gap-1.5 rounded-lg border border-[#eaecf0] bg-white px-2 py-1.5 opacity-0 shadow-[0_8px_24px_-8px_rgba(12,51,84,0.35)] transition-[opacity,transform] duration-200 data-[on=1]:translate-y-0 data-[on=1]:opacity-100 dark:border-slate-700 dark:bg-slate-800"
                    >
                      {HIGHLIGHT_COLORS.map((color) => (
                        <span
                          key={color}
                          data-j={color === "#fff300" ? "ls-dot" : undefined}
                          className="h-4 w-4 rounded-full transition-shadow duration-200 data-[on=1]:ring-2 data-[on=1]:ring-[#2D7597] data-[on=1]:ring-offset-1"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                      <span className="mx-0.5 h-4 w-px bg-slate-200" />
                      <span
                        data-j="ls-note-btn"
                        className={cn("rounded p-0.5", PRESSABLE)}
                      >
                        <IconNotebook className="h-4 w-4 text-slate-600" />
                      </span>
                      {/* Only shown on an existing highlight */}
                      <span
                        data-j="ls-tb-trash"
                        className="hidden data-[on=1]:inline"
                      >
                        <IconTrash className="h-4 w-4 text-slate-600" />
                      </span>
                    </span>
                  </p>
                  <p>
                    Commits let you compare versions, find where a bug was
                    introduced, and work on new ideas without losing old ones.
                  </p>
                </div>

                {/* Check-in (components/droplets/lessons/quiz.tsx) */}
                <div
                  data-j="ls-quiz"
                  className="-mx-4 mt-8 rounded-md border border-slate-200 bg-slate-50 px-6 py-7 dark:border-slate-700 dark:bg-slate-800"
                >
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                    Let’s Check In!
                  </h3>
                  <p className="text-[13px] text-slate-600 dark:text-slate-400">
                    Test your knowledge and see what you just learned.
                  </p>
                  <div className="mx-auto mt-5 w-full max-w-md rounded-md border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
                    <p className="text-[15px] font-semibold text-slate-900 dark:text-white">
                      What does a commit record?
                    </p>
                    <p className="mt-1 text-[12px] text-slate-500">
                      Select one answer
                    </p>
                    <ul className="mt-3 space-y-2 text-[14px] text-slate-700 dark:text-slate-300">
                      {[
                        "A snapshot of your project",
                        "A backup of your computer",
                        "A message to your team",
                      ].map((answer, i) => (
                        <li key={answer} className="flex items-center gap-2.5">
                          <span
                            data-j={i === 0 ? "ls-opt" : undefined}
                            className="flex h-4 w-4 items-center justify-center rounded-full border border-slate-400 transition-colors duration-200 data-[on=1]:border-slate-900 dark:data-[on=1]:border-white [&[data-on='1']>span]:scale-100"
                          >
                            <span className="h-2 w-2 scale-0 rounded-full bg-slate-900 transition-transform duration-200 dark:bg-white" />
                          </span>
                          {answer}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4 flex h-10 items-center gap-3">
                      <span
                        data-j="ls-check"
                        className={cn(
                          "inline-flex h-9 items-center gap-2 rounded-md bg-slate-900 px-4 text-[13px] font-medium text-slate-50 data-[on=0]:hidden dark:bg-slate-50 dark:text-slate-900",
                          PRESSABLE,
                        )}
                      >
                        Check Answer <IconArrowRight className="h-4 w-4" />
                      </span>
                      <span
                        data-j="ls-result"
                        className="hidden items-center gap-3 data-[on=1]:flex"
                      >
                        <span className="rounded-full bg-green-100 px-3 py-1 text-base font-medium text-green-700">
                          That’s Right!
                        </span>
                        <span className="inline-flex h-9 items-center rounded-md border border-slate-200 px-3 text-[13px] font-medium dark:border-slate-700">
                          View Answer
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Later lessons, shown briefly as the learner moves through
                  them. Their content is drawn as placeholder lines. */}
              <div
                data-j="ls-skel"
                className={cn(
                  "absolute inset-0 bg-white opacity-0 dark:bg-slate-900",
                  compact ? "px-5 pt-14" : "px-10 pt-6",
                )}
              >
                <h2
                  data-j="ls-skel-title"
                  className="pr-10 text-[28px] leading-tight font-bold text-slate-900 dark:text-white"
                >
                  {SAMPLE_LESSONS[1]}
                </h2>
                <div className="mt-6 space-y-3">
                  {[94, 100, 86, 97, 72, 0, 90, 64].map((w, i) => (
                    <span
                      key={i}
                      className="block h-3 rounded-full bg-slate-100 dark:bg-slate-800"
                      style={{ width: `${w}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Footer navigation (components/droplets/footer.tsx) */}
            <div
              className={cn(
                "flex shrink-0 items-center justify-between gap-2 border-t border-slate-100 bg-white py-3 dark:border-slate-800 dark:bg-slate-900",
                compact ? "flex-wrap px-4" : "px-10",
              )}
            >
              <span className={SECONDARY}>
                <IconArrowLeft className="h-4 w-4" />
                Previous
              </span>
              <span
                data-j="ls-complete"
                data-state="disabled"
                className={cn(
                  PRIMARY,
                  PRESSABLE,
                  "data-[state=disabled]:opacity-50",
                  !compact && "ml-auto",
                )}
              >
                <span data-j="ls-complete-label">Mark as complete</span>
              </span>
              <span className={cn("flex justify-end", compact && "w-full")}>
                <span
                  data-j="ls-gate"
                  className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-[#d0d5dd] px-3 text-[12px] font-medium text-[#344054] opacity-40 data-[on=0]:hidden dark:text-slate-300"
                >
                  <IconLock className="h-4 w-4" />
                  Complete all quizzes to proceed
                </span>
                <span
                  data-j="ls-next"
                  className="hidden data-[on=1]:inline-flex"
                >
                  <span className={SECONDARY}>
                    Next <IconArrowRight className="h-4 w-4" />
                  </span>
                </span>
              </span>
            </div>
          </div>

          {/* Recap view (app/(droplets)/d/[slug]/recap/page.tsx) */}
          <div
            data-j="ls-view-recap"
            className={cn(
              "absolute inset-0 overflow-hidden bg-white opacity-0 dark:bg-slate-900",
              compact ? "px-5 pt-14" : "px-10 pt-6",
            )}
          >
            <h2 className="text-[28px] leading-tight font-bold text-slate-900 dark:text-white">
              Recap
            </h2>
            <h3 className="mt-5 text-lg font-bold text-slate-900 dark:text-white">
              Learning Objectives
            </h3>
            <p className="text-[13px] text-slate-600 dark:text-slate-400">
              Now that you have completed this Droplet, you should:
            </p>
            <ul className="mt-2 space-y-1.5 text-[14px] text-slate-700 dark:text-slate-300">
              {[
                "Explain what version control is for",
                "Commit, branch, and merge with Git",
              ].map((o) => (
                <li key={o} className="flex items-center gap-2">
                  <IconTarget className="h-4 w-4 text-[#2D7597]" />
                  {o}
                </li>
              ))}
            </ul>
            <h3 className="mt-5 text-lg font-bold text-slate-900 dark:text-white">
              Notes
            </h3>
            <p className="text-[13px] text-slate-600 dark:text-slate-400">
              A collection of notes and highlights that you created throughout
              this droplet:
            </p>
            <div className="mt-2 rounded-md border border-slate-200 p-2.5 text-[13px] dark:border-slate-700">
              <p className="text-[11px] font-semibold text-slate-500">
                {SAMPLE_LESSONS[0]}
              </p>
              <p className="mt-1">
                <span className="rounded bg-[#fff300] px-1 text-black">
                  A commit is a snapshot of your project at a moment in time.
                </span>
              </p>
              <p className="mt-1 text-slate-700 dark:text-slate-300">
                Snapshots, not diffs. Review before the check-in.
              </p>
            </div>
            <h3 className="mt-5 text-lg font-bold text-slate-900 dark:text-white">
              Rate this Droplet!
            </h3>
            <div className="mt-1 flex gap-1 text-slate-300">
              {[0, 1, 2, 3, 4].map((i) => (
                <IconStar key={i} className="h-6 w-6" />
              ))}
            </div>
          </div>

          {/* Notes bar (components/droplets/note-taking/notes-bar.tsx) */}
          <div
            data-j="ls-notes"
            className={cn(
              "absolute inset-y-0 right-0 z-20 translate-x-full border-l border-slate-200 bg-[#FCFCFD] p-4 transition-transform duration-500 ease-out data-[on=1]:translate-x-0 dark:border-slate-700 dark:bg-slate-900",
              compact ? "w-[88%]" : "w-[250px]",
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xl font-extrabold text-slate-900 dark:text-white">
                My Notes
              </span>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2D7597] text-white">
                <IconPlus className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-1 text-[12px] text-slate-500">
              Click anywhere to create a note
            </p>
            <div
              data-j="ls-note"
              className="mt-16 translate-y-2 rounded-[8px] border bg-white p-2 opacity-0 shadow-[0px_0px_8px_rgb(29,58,138)] transition-[opacity,transform] duration-300 data-[on=1]:translate-y-0 data-[on=1]:opacity-100 dark:bg-slate-800"
            >
              <div className="flex items-center gap-1.5">
                <IconGripVertical className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="truncate rounded bg-[#fff300] px-1.5 text-[11px] text-black">
                  A commit is a snapshot…
                </span>
                <IconChevronUp className="ml-auto h-3.5 w-3.5 shrink-0 text-slate-500" />
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-red-700 text-white">
                  <IconTrash className="h-3 w-3" />
                </span>
              </div>
              <p className="mt-2 px-1 text-[13px] leading-snug text-slate-700 dark:text-slate-200">
                Snapshots, not diffs. Review before the check-in.
              </p>
            </div>
          </div>

          {/* Completion modal and confetti (completed-droplet-block.tsx) */}
          <div
            data-j="ls-modal"
            className="absolute inset-0 z-30 flex items-center justify-center bg-slate-900/10 opacity-0"
          >
            <div
              data-j="ls-confetti"
              className="pointer-events-none absolute top-1/2 left-1/2"
              style={{ "--b": 0 } as React.CSSProperties}
            >
              {CONFETTI.map((c, i) => (
                <span
                  key={i}
                  className="absolute rounded-full bg-[#297496]"
                  style={{
                    width: c.size,
                    height: c.size,
                    transform: `translate(calc(var(--b) * ${c.x}px), calc(var(--b) * ${c.y}px))`,
                    opacity: "calc(1 - var(--b) * var(--b))",
                  }}
                />
              ))}
            </div>
            <div
              data-j="ls-modal-card"
              className="relative mx-6 max-w-[320px] rounded-lg border border-slate-200 bg-white p-6 text-center shadow-[0_20px_50px_-12px_rgba(12,51,84,0.45)] dark:border-slate-700 dark:bg-slate-800"
            >
              <IconX className="absolute top-3 right-3 h-4 w-4 text-slate-400" />
              <p className="text-[15px] leading-6 text-slate-700 dark:text-slate-200">
                <span className="font-bold text-slate-900 dark:text-white">
                  You did it!
                </span>{" "}
                Congratulations on completing this “Git Fundamentals” Droplet.
              </p>
              <span className={cn(PRIMARY, "mt-4")}>Share with friends</span>
            </div>
          </div>
        </div>
      </div>
    </AppFrame>
  );
}
