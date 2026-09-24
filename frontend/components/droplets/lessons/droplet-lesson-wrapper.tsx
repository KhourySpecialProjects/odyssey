"use client";

import { LessonRenderer } from "./lesson-renderer";
import { useState, useCallback, useEffect } from "react";
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
          <h2 className="text-2xl font-extrabold">My Notes</h2>
          <span
            aria-hidden="true"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d0d5dd] bg-white text-[#344054] opacity-50 shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)]"
          >
            <IconPlus className="h-4 w-4" />
          </span>
        </div>
        {/* Only the spinner is the live region, so screen readers announce
            "Loading notes" rather than the heading as well */}
        <div role="status" className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          <span className="sr-only">Loading notes</span>
        </div>
      </div>
    ),
  },
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
  initialNotes,
  initialHighlights,
}: DropletLessonWrapperProps) {
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [expanded, setExpanded] = useState(false);
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
      if (e.key === "Escape") {
        setExpanded(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [setExpanded]);

  return (
    <>
      <div className="lesson-wrapper relative z-30 h-full w-full overflow-x-hidden">
        <div
          className={cn(
            "flex w-full flex-col px-4 pt-6 transition-[padding] duration-300 sm:px-8 lg:px-40",
            // The notes panel overlays the lesson below lg, so only reserve its
            // width where there is room beside it
            expanded && "lg:pr-[415px]",
          )}
        >
          <LessonRenderer
            lesson={lesson}
            droplet={droplet}
            enrollmentId={enrollmentId}
            completedLessonIds={completedLessonIds}
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
            completedLessonIds={completedLessonIds}
          />
        </div>
        {enrollmentId && (
          <>
            <div
              className={cn(
                "fixed top-[107px] right-0 min-w-[375px] border border-slate-200 bg-[#FCFCFD] dark:border-slate-500 dark:bg-slate-900",
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
