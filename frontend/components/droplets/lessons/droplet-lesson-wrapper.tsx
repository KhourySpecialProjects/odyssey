"use client";

import { LessonRenderer } from "./lesson-renderer";
import { NotesBar } from "./note-taking/notes-bar";
import { useState, useCallback, useEffect, useRef } from "react";
import { Droplet, Lesson, User, AuthorizedUser, Note } from "@/types";
import { getNotesByAuthorizedUserAndLesson } from "@/lib/requests/notes";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

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

  return (
    <>
      <div
        className={`relative w-full h-full lesson-wrapper overflow-x-hidden ${expanded ? "" : "lg:pl-40"}`}
      >
        <div
          className={cn(
            "w-[65%] min-w-[700px] flex justify-center",
            expanded ? "" : "",
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
            onUpdate={fetchNotes}
            expanded={expanded}
            setExpanded={setExpanded}
          />
        </div>
        {enrollmentId && (
          <>
            <div
              className={cn(
                "absolute min-w-[375px] lg:w-[25%] min-h-screen h-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-500",
                "z-10 overflow-y-hidden sliding-notes-bar",
                expanded
                  ? "right-0 top-0 visibility: visible "
                  : "visibility: hidden",
              )}
            >
              <div className="flex justify-end items-center p-4 border-b border-slate-200 dark:border-slate-500">
                <button onClick={() => setExpanded(false)}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className={cn("", expanded ? "" : "")}>
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
