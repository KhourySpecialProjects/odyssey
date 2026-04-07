"use client";

import { Enrollment, Lesson, Note } from "@/types";
import { useState, useCallback, useEffect } from "react";
import {
  deleteNote,
  getNotesByAuthorizedUserAndLesson,
} from "@/lib/requests/notes";
import { NoteBlock } from "./note-block";
import { getEnrollByID } from "@/lib/requests/enrollment";
import { createNote } from "@/lib/requests/notes";
import { updateNotePosition } from "@/lib/requests/notes";
import { IconPlus } from "@tabler/icons-react";

export function NotesBar({
  userId,
  lesson,
  enrollmentId,
  initNotes,
}: {
  userId: number;
  lesson: Lesson;
  enrollmentId: string | undefined;
  initNotes: Note[];
}) {
  const [notes, setNotes] = useState(initNotes);
  const [draggedNote, setDraggedNote] = useState<Note | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [pageHeight, setPageHeight] = useState(0);
  const [, setNoteDisabled] = useState(false);
  const [focused, setFocused] = useState<number | null>(null);
  const [popoverY, setPopoverY] = useState<number | null>(null);
  const [popoverX, setPopoverX] = useState<number | null>(null);

  if (!enrollmentId) {
    enrollmentId = "";
  }

  useEffect(() => {
    const updateHeight = () => {
      const height =
        document.querySelector(".lesson-wrapper")?.scrollHeight || 0;
      setPageHeight(height);
    };

    updateHeight();

    window.addEventListener("resize", updateHeight);
    return () => {
      window.removeEventListener("resize", updateHeight);
    };
  }, [draggedNote]);

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

  const handleDragMove = useCallback(
    (e: MouseEvent) => {
      if (!draggedNote) return;
      let newPosition = e.pageY - dragOffset;

      if (newPosition < 50) {
        newPosition = 50;
      }

      if (pageHeight && newPosition > pageHeight - 350) {
        newPosition = pageHeight - 350;
      }

      setNotes((prev) =>
        prev.map((note) =>
          note.id === draggedNote.id
            ? { ...note, positionY: newPosition }
            : note,
        ),
      );
    },
    [draggedNote, dragOffset],
  );

  const handleDragEnd = useCallback(async () => {
    if (!draggedNote) return;

    document.removeEventListener("mousemove", handleDragMove);
    document.removeEventListener("mouseup", handleDragEnd);

    try {
      const currentNote = notes.find((n) => n.id === draggedNote.id);
      if (currentNote) {
        await updateNotePosition(draggedNote.id, currentNote.positionY, userId);
        await fetchNotes();
      }
    } catch (error) {
      console.error("Failed to update note position:", error);
      await fetchNotes();
    }

    setDraggedNote(null);
    setNoteDisabled(false);
  }, [draggedNote, notes, fetchNotes, handleDragMove]);

  const handleDragStart = (note: Note, e: React.MouseEvent) => {
    if (!(e.target as HTMLElement).closest(".grip-handle")) {
      return;
    }

    e.preventDefault();
    setDraggedNote(note);
    setDragOffset(e.pageY - note.positionY);
  };

  useEffect(() => {
    if (draggedNote) {
      document.addEventListener("mousemove", handleDragMove);
      document.addEventListener("mouseup", handleDragEnd);
      return () => {
        document.removeEventListener("mousemove", handleDragMove);
        document.removeEventListener("mouseup", handleDragEnd);
      };
    }
  }, [draggedNote, handleDragMove, handleDragEnd]);

  useEffect(() => {
    setNotes(initNotes);
  }, [initNotes]);

  const createNoteAtY = async (posY: number) => {
    setNoteDisabled(true);
    const newNote: Note = {
      id: 0,
      content: "Loading...",
      lesson: lesson,
      enrollment: {} as Enrollment,
      positionY: posY + 50,
    };
    setNotes((prev) => [...prev, newNote]);

    const enrollment = await getEnrollByID(String(enrollmentId), {
      fields: ["id"],
      populate: {},
    });
    const result = await createNote(lesson, enrollment, posY + 50, userId);

    if (result.success) {
      await fetchNotes();
    } else {
      console.error("Failed to create note:", result.error);
      setNotes((prev) => prev.filter((n) => n.id !== 0));
    }

    setNoteDisabled(false);
  };

  const handleDeleteNote = async (id: number) => {
    try {
      setNotes((currentNotes) => currentNotes.filter((note) => note.id !== id));

      const result = await deleteNote(id, userId);
      if (!result.ok) {
        const updatedNotes = await getNotesByAuthorizedUserAndLesson(
          userId,
          lesson.slug,
        );
        setNotes(updatedNotes);
      }
    } catch (error) {
      console.error("Failed to delete note:", error);
      const updatedNotes = await getNotesByAuthorizedUserAndLesson(
        userId,
        lesson.slug,
      );
      setNotes(updatedNotes);
    }
  };

  return (
    <div className="">
      <div className="mt-5 mb-10 flex items-center justify-between px-8 pl-12">
        <h1 className="text-2xl font-extrabold">My Notes</h1>
        <button
          onClick={() => {
            const maxY =
              notes.length > 0
                ? Math.max(...notes.map((n) => n.positionY))
                : 30;
            createNoteAtY(notes.length > 0 ? maxY + 180 : 30);
          }}
          title="Create a note"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d0d5dd] bg-white text-[#344054] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] transition-colors hover:bg-slate-50"
        >
          <IconPlus className="h-4 w-4" />
        </button>
      </div>

      <div
        className="notes-bar relative w-full space-y-4"
        style={{ height: pageHeight + "px" }}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          // Don't open popover when clicking on note blocks or delete buttons
          if (
            target.closest(".note-block") ||
            target.closest("[data-testid='deleteNote']")
          ) {
            return;
          }
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          const relativeY = e.clientY - rect.top;
          const relativeX = e.clientX - rect.right;
          setPopoverY(relativeY);
          setPopoverX(relativeX);
        }}
      >
        <p className="pointer-events-none absolute top-2 right-0 left-0 text-center text-sm text-slate-400">
          Click anywhere to create a note
        </p>

        {popoverY !== null && (
          <div
            className="absolute z-30 rounded border border-slate-200 bg-white px-3 py-2 shadow-md"
            style={{
              top: `${popoverY}px`,
              right: `${Math.abs(popoverX ?? 0)}px`,
            }}
          >
            <button
              type="button"
              className="text-sm font-medium text-slate-700 hover:text-slate-900"
              onClick={async (e) => {
                e.stopPropagation();
                setPopoverY(null);
                setPopoverX(null);
                await createNoteAtY(popoverY);
              }}
            >
              Create a Note?
            </button>
          </div>
        )}

        {notes.map((note) => (
          <div
            key={note.id}
            className={`absolute w-full -translate-y-1/2 transform transition-transform ${draggedNote?.id === note.id ? "cursor-grabbing" : ""} ${focused === note.id ? "z-20" : "z-0"}`}
            style={{
              top: `${note.positionY}px`,
              transform: `translateY(-50%)`,
            }}
            onMouseDown={(e) => handleDragStart(note, e)}
          >
            <div
              className={`flex flex-row items-center justify-center ${!focused || focused === note.id ? "opacity-100" : "opacity-30"} ${draggedNote?.id !== note.id ? "scale-100" : "scale-105"}`}
            >
              <NoteBlock
                note={note}
                authorizedUserId={userId}
                onUpdate={fetchNotes}
                onDelete={handleDeleteNote}
                onFocus={setFocused}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
