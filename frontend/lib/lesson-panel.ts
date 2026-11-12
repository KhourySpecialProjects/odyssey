// Full literal strings, and in lib/ because Tailwind only scans its content
// globs (not stores/). Both panels are 380px; the toggle column (48px) sits just beside them.
export const LESSON_PANEL = {
  width: "w-[380px] min-w-[380px]",
  // Mentor covers the whole screen below sm
  sheet:
    "fixed inset-0 z-[60] w-full sm:inset-auto sm:top-[107px] sm:right-0 sm:z-[55] sm:h-[calc(100vh-107px)] sm:w-[380px] sm:min-w-[380px]",
  notesContentPad: "pr-[420px]",
  mentorContentPad: "sm:pr-[420px]",
  toggleRight: "right-[392px]",
} as const;
