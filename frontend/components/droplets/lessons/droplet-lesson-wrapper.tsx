"use client";

import { LessonRenderer } from "./lesson-renderer";
import { useState, useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import {
  Droplet,
  Lesson,
  User,
  AuthorizedUser,
  Note,
  Highlight,
} from "@/types";
import { getNotesByAuthorizedUserAndLesson } from "@/lib/requests/notes";
import { cn } from "@/lib/utils";
import { IconPlus, IconX } from "@tabler/icons-react";
import { Loader2 } from "lucide-react";
import DropletFooter from "../footer";
import { useViewedLessonIds } from "@/stores/viewed-lessons-store";
import { LESSON_PANEL } from "@/lib/lesson-panel";
import { lessonGate } from "@/lib/lesson-gate";
import {
  useLessonPanelStore,
  useOwnedMentorKept,
  useOwnedPanel,
} from "@/stores/lesson-panel-store";

// NotesBar pulls in TipTap/ProseMirror for every note, so it's loaded on demand.
// The fallback matches its header row (title + "+" button, inactive until the
// panel loads) with the app's small loading spinner below.
const NotesBar = dynamic(
  () => import("./note-taking/notes-bar").then((mod) => mod.NotesBar),
  {
    ssr: false,
    loading: () => (
      <div>
        <div className="mt-5 mb-10 flex items-center justify-between px-8 pl-12">
          <h1 className="text-2xl font-extrabold">My Notes</h1>
          <span
            aria-hidden="true"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d0d5dd] bg-white text-[#344054] opacity-50 shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)]"
          >
            <IconPlus className="h-4 w-4" />
          </span>
        </div>
        {/* Only the spinner is the live region, so screen readers announce
            "Loading notes" rather than the heading as well. aria-live, not
            role="status": the footer counts [role="status"] as answered quizzes */}
        <div
          aria-live="polite"
          className="flex items-center justify-center py-12"
        >
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          <span className="sr-only">Loading notes</span>
        </div>
      </div>
    ),
  },
);

// The sheet pulls in Radix Dialog and Markdown, so it loads when first opened
const MentorPanel = dynamic(
  () => import("./mentor/mentor-panel").then((mod) => mod.MentorPanel),
  { ssr: false },
);

interface DropletLessonWrapperProps {
  lesson: Lesson;
  droplet: Droplet;
  enrollmentId?: string;
  completedLessonIds: number[];
  user?: User | null;
  author: boolean;
  authUser: AuthorizedUser;
  userId: number;
  /** The page's verdict: Mentor is on for this droplet and this user */
  mentor: boolean;
  /** Fetched by the lesson page; refetched here only after a note is created */
  initialNotes: Note[];
  initialHighlights: Highlight[];
}

export function DropletLessonWrapper({
  lesson,
  droplet,
  enrollmentId,
  completedLessonIds,
  user,
  author,
  authUser,
  userId,
  mentor,
  initialNotes,
  initialHighlights,
}: DropletLessonWrapperProps) {
  // Includes lessons whose save is still in flight, so the next lesson isn't
  // shown as locked (and its quiz gate skipped) while "Next" saves.
  const viewedLessonIds = useViewedLessonIds(enrollmentId, completedLessonIds);
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const panel = useOwnedPanel(lesson.id);
  const mentorKept = useOwnedMentorKept(lesson.id);
  const setPanel = useLessonPanelStore((s) => s.setPanel);
  const expanded = panel === "notes";
  const setExpanded = useCallback(
    (open: boolean) => setPanel(open ? "notes" : null),
    [setPanel],
  );
  // NotesBar isn't mounted until the panel is first opened, then stays mounted
  // so its state (drag position, open editors) survives collapsing
  const [notesBarOpened, setNotesBarOpened] = useState(false);
  if (expanded && !notesBarOpened) {
    setNotesBarOpened(true);
  }

  const fetchNotes = useCallback(async () => {
    const fetchedNotes = await getNotesByAuthorizedUserAndLesson(
      userId,
      lesson.slug,
    );
    setNotes(fetchedNotes);
  }, [userId, lesson.slug]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Mentor's dialog handles its own Escape
      if (
        e.key === "Escape" &&
        useLessonPanelStore.getState().panel === "notes"
      ) {
        setExpanded(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [setExpanded]);

  // Claim the store for this lesson; leaving or changing lesson clears it
  useEffect(() => {
    const { claim, reset } = useLessonPanelStore.getState();
    claim(lesson.id);
    return reset;
  }, [lesson.id]);

  const { gate } = lessonGate({
    lessonId: lesson.id,
    lessons: droplet.lessons,
    enrollmentId,
    completedLessonIds: viewedLessonIds,
    author,
    roles: user?.roles,
  });
  const available = mentor && gate === "open";
  const wasAvailable = useRef(false);
  // Passive effect with no run-once guard: the previous lesson's reset()
  // runs first and would otherwise wipe this lesson's availability.
  useEffect(() => {
    const { setMentorAvailable, closeMentor, mentorKept, panel } =
      useLessonPanelStore.getState();
    setMentorAvailable(available);
    // Losing availability mid-lesson would strand an open sheet without its button
    if (
      wasAvailable.current &&
      !available &&
      (mentorKept || panel === "mentor")
    )
      closeMentor();
    wasAvailable.current = available;
    return () => setMentorAvailable(false);
  }, [available]);

  return (
    <>
      <div className="lesson-wrapper relative z-30 h-full w-full overflow-x-hidden">
        <div
          className={cn(
            "flex w-full flex-col pt-6 transition-[padding] duration-300",
            expanded || panel === "mentor"
              ? LESSON_PANEL.contentPanelOpen
              : LESSON_PANEL.contentClosed,
            expanded && LESSON_PANEL.notesContentPad,
            panel === "mentor" && LESSON_PANEL.mentorContentPad,
          )}
        >
          <LessonRenderer
            lesson={lesson}
            droplet={droplet}
            enrollmentId={enrollmentId}
            completedLessonIds={viewedLessonIds}
            user={user}
            author={author}
            authUser={authUser}
            initialHighlights={initialHighlights}
            onUpdate={fetchNotes}
            expanded={expanded}
            setExpanded={setExpanded}
          />
          <DropletFooter
            droplet={droplet}
            enrollmentId={enrollmentId}
            currentLessonId={lesson.id}
            completedLessonIds={viewedLessonIds}
          />
        </div>
        {mentorKept && (
          <MentorPanel
            dropletId={droplet.id}
            lesson={lesson}
            enrollmentId={enrollmentId}
            userId={userId}
            onNoteSaved={fetchNotes}
          />
        )}
        {enrollmentId && (
          <>
            <div
              className={cn(
                "fixed top-[107px] right-0 border border-slate-200 bg-[#FCFCFD] dark:border-slate-500 dark:bg-slate-900",
                LESSON_PANEL.width,
                "sliding-notes-bar z-40 overflow-y-auto",
                "h-[calc(100vh-107px)]",
                expanded ? "visible" : "invisible",
              )}
            >
              <div className="flex items-center justify-end border-b border-slate-200 p-4 dark:border-slate-500">
                <button onClick={() => setExpanded(false)}>
                  <IconX className="h-5 w-5" />
                </button>
              </div>
              <div>
                {notesBarOpened && (
                  <NotesBar
                    userId={userId}
                    lesson={lesson}
                    enrollmentId={enrollmentId}
                    initNotes={notes}
                  />
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
