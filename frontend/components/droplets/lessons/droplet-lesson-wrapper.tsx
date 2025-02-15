"use client";

import { LessonRenderer } from "./lesson-renderer";
import { NotesBar } from "./note-taking/notes-bar";
import { useState, useCallback, useEffect } from "react";
import { Droplet, Lesson, User, AuthorizedUser, Note } from "@/types";
import { getNotesByAuthorizedUserAndLesson } from "@/lib/requests/notes";

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
      <div className="w-1/2 flex justify-center">
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
        <div className="w-1/4 bg-slate-50 rounded-lg border border-slate-200">
          <NotesBar
            userId={userId}
            lesson={lesson}
            enrollmentId={enrollmentId}
            initNotes={notes}
          />
        </div>
      )}
    </>
  );
}
