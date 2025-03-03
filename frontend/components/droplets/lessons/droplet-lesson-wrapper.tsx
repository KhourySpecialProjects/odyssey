"use client";

import { LessonRenderer } from "./lesson-renderer";
import { NotesBar } from "./note-taking/notes-bar";
import { useState, useCallback, useEffect } from "react";
import { Droplet, Lesson, User, AuthorizedUser, Note } from "@/types";
import { getNotesByAuthorizedUserAndLesson } from "@/lib/requests/notes";
import { cn } from "@/lib/utils";
import { NotepadText, X } from "lucide-react";

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
      <div className="w-[65%] min-w-[700px] flex justify-center">
        <LessonRenderer
          lesson={lesson}
          droplet={droplet}
          enrollmentId={enrollmentId}
          completedLessonIds={completedLessonIds}
          user={user}
          author={author}
          authUser={authUser}
          onUpdate={fetchNotes}
        />
      </div>
      {enrollmentId && (
        <>
          <button
            className="fixed top-32 right-24 z-50 dark:text-black p-2 transform -translate-x-1/2 bg-blue-100 border border-black rounded shadow-lg"
            title="View Notes Bar"
            onClick={() => setExpanded(!expanded)}
          >
            <NotepadText />
          </button>
          <div
            className={cn(
              "fixed min-w-[375px] lg:w-[25%] min-h-screen bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-500",
              " right-0 z-10 overflow-y-auto",
              expanded
                ? "translate-x-0 visibility: visible"
                : "translate-x-full visibility: hidden",
            )}
          >
            <div className=" flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-500">
              <button onClick={() => setExpanded(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <NotesBar
              userId={userId}
              lesson={lesson}
              enrollmentId={enrollmentId}
              initNotes={notes}
            />
          </div>
        </>
      )}
    </>
  );
}
