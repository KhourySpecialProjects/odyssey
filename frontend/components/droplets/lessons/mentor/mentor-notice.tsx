"use client";

// Placeholder until ODY-883 approves the text; bump the version to show it again
export const MENTOR_NOTICE_VERSION = 1;
const KEY = `mentor-notice-v${MENTOR_NOTICE_VERSION}`;

export function noticeAccepted(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function acceptNotice() {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    // Storage is blocked: the notice shows again next visit
  }
}

const POINTS = [
  "Mentor sends your question and this lesson to an AI model.",
  "Don't include personal information.",
  "Mentor can be wrong: check what it says against the lesson.",
  "In check-ins, Mentor gives hints, not answers.",
];

export function MentorNotice({
  onAccept,
  buttonRef,
}: {
  onAccept: () => void;
  buttonRef: React.Ref<HTMLButtonElement>;
}) {
  return (
    <section
      aria-label="Before you ask"
      className="border-mentor-line bg-mentor-soft rounded-lg border p-3 text-sm text-slate-900 dark:text-slate-100"
    >
      <ul className="list-disc space-y-1 pl-4">
        {POINTS.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
      <button
        ref={buttonRef}
        type="button"
        onClick={onAccept}
        className="bg-mentor dark:bg-mentor-line mt-3 rounded-md px-3 py-1.5 text-sm font-semibold text-white focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        Got it
      </button>
    </section>
  );
}
