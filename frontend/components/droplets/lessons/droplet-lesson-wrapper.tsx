"use client";

import { LessonRenderer } from "./lesson-renderer";
import { NotesBar } from "./note-taking/notes-bar";
import { useState, useCallback, useEffect } from "react";
import { Droplet, Lesson, User, AuthorizedUser, Note } from "@/types";
import { getNotesByAuthorizedUserAndLesson } from "@/lib/requests/notes";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import DropletFooter from "../footer";

interface DropletLessonWrapperProps {
  lesson: Lesson;
  droplet: Droplet;
  enrollmentId?: string;
  completedLessonIds: number[];
  user?: User | null;
  author: boolean;
  authUser: AuthorizedUser;
  userId: number;
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
}: DropletLessonWrapperProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [expanded, setExpanded] = useState(false);

  const fetchNotes = useCallback(async () => {
    const fetchedNotes = await getNotesByAuthorizedUserAndLesson(
      userId,
      lesson.slug,
    );
    setNotes(fetchedNotes);
  }, [userId, lesson.slug]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

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
          className={`flex flex-col items-center justify-center pr-10 pl-10 md:min-w-[500px] xl:pl-0 ${expanded ? "w-[65%]" : "w-full"}`}
        >
          <LessonRenderer
            lesson={lesson}
            droplet={droplet}
            enrollmentId={enrollmentId}
            completedLessonIds={completedLessonIds}
            user={user}
            author={author}
            authUser={authUser}
            onUpdate={fetchNotes}
            expanded={expanded}
            setExpanded={setExpanded}
          />
          <DropletFooter
            droplet={droplet}
            enrollmentId={enrollmentId}
            currentLessonId={lesson.id}
          />
        </div>
        {enrollmentId && (
          <>
            <div
              className={cn(
                "absolute h-full min-h-screen min-w-[375px] border border-slate-200 bg-slate-50 dark:border-slate-500 dark:bg-slate-800",
                "sliding-notes-bar z-10 overflow-y-hidden",
                expanded
                  ? "visibility: visible top-0 right-0"
                  : "visibility: hidden",
              )}
            >
              <div className="flex items-center justify-end border-b border-slate-200 p-4 dark:border-slate-500">
                <button onClick={() => setExpanded(false)}>
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div>
                <NotesBar
                  userId={userId}
                  lesson={lesson}
                  enrollmentId={enrollmentId}
                  initNotes={notes}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
