"use client";

import { Sparkles } from "lucide-react";
import { useLessonPanelStore } from "@/stores/lesson-panel-store";

/** Opens the Mentor sheet; renders nothing unless the lesson page enabled it. */
export function AskMentorButton() {
  const available = useLessonPanelStore((s) => s.mentorAvailable);
  const open = useLessonPanelStore((s) => s.panel === "mentor");
  const openMentor = useLessonPanelStore((s) => s.openMentor);
  const closeMentor = useLessonPanelStore((s) => s.closeMentor);

  if (!available) return null;

  return (
    <button
      id="ask-mentor-button"
      type="button"
      title="Ask Mentor"
      aria-expanded={open}
      onClick={open ? closeMentor : openMentor}
      className="border-mentor-line bg-mentor-soft text-mentor-text inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm font-semibold"
    >
      <Sparkles className="text-mentor h-4 w-4" aria-hidden="true" />
      <span className="sr-only sm:not-sr-only">Ask Mentor</span>
      <span
        aria-hidden="true"
        className="bg-mentor dark:bg-mentor-line hidden rounded-full px-1.5 text-[10px] leading-4 font-bold text-white sm:inline"
      >
        New
      </span>
    </button>
  );
}
