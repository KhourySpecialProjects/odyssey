// Full literal strings, and in lib/ because Tailwind only scans its content
// globs (not stores/). Both panels are 380px; the toggle column (48px) sits just beside them.
export const LESSON_PANEL = {
  width: "w-[380px] min-w-[380px]",
  // Mentor covers the whole screen below sm
  sheet:
    "fixed inset-0 z-[60] w-full sm:inset-auto sm:top-[107px] sm:right-0 sm:z-[55] sm:h-[calc(100vh-107px)] sm:w-[380px] sm:min-w-[380px]",
  // Neither panel open: shrink the side padding and cap at 1536px, so wide
  // windows don't go full-bleed
  contentClosed: "mx-auto max-w-screen-2xl px-12",
  contentPanelOpen: "px-40",
  notesContentPad: "pr-[420px]",
  mentorContentPad: "sm:pr-[420px]",
  // Slightly over the 300ms slide in globals.css (.sliding-notes-bar)
  closeFallbackMs: 350,
  toggleRight: "right-[392px]",
} as const;
