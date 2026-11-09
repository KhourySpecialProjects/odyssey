// Full literal strings, and in lib/ because Tailwind only scans its content
// globs (not stores/). Both panels are 380px.
export const LESSON_PANEL = {
  width: "w-[380px] min-w-[380px]",
  notesContentPad: "pr-[420px]",
  mentorContentPad: "sm:pr-[420px]",
  toggleRight: "right-[360px]",
} as const;
