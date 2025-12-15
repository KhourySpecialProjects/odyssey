"use client";

import { Enrollment, Lesson, Note } from "@/types";
import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  deleteNote,
  getNotesByAuthorizedUserAndLesson,
} from "@/lib/requests/notes";
import { NoteBlock } from "./note-block";
import { getEnrollByID } from "@/lib/requests/enrollment";
import { createNote } from "@/lib/requests/notes";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { updateNotePosition } from "@/lib/requests/notes";
import { Badge } from "@/components/ui/badge";

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
        await updateNotePosition(draggedNote.id, currentNote.positionY);
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

  const [dialogOpen, setDialogOpen] = useState(false);
  const [mousePositionY, setMousePositionY] = useState(0);
  const [mousePositionX, setMousePositionX] = useState(0);
  const [selectedNote, setSelectedNote] = useState(false);
  const [, setNoteDisabled] = useState(false);
  const [focused, setFocused] = useState<number | null>(null);

  if (!enrollmentId) {
    enrollmentId = "";
  }

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  useEffect(() => {
    setNotes(initNotes);
  }, [initNotes]);

  const handleMouseClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (
      (e.target as HTMLElement).closest(".note-block") ||
      (e.target as HTMLElement).closest(".trash-icon")
    ) {
      if (dialogOpen === true) {
        setDialogOpen(false);
      }
      setSelectedNote(true);
      return;
    }

    if (selectedNote === false) {
      const rect = e.currentTarget.getBoundingClientRect();
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const notesBarTop = rect.top + scrollTop;

      const clickY = e.clientY + scrollTop - notesBarTop;
      setMousePositionY(clickY);

      const rightOffset = ((rect.right - e.clientX) / rect.width) * 100;
      setMousePositionX(100 - rightOffset);
      setDialogOpen(!dialogOpen);
    }
    setSelectedNote(false);
  };

  const handleAddNote = () => {
    const handleAddNote = async () => {
      setDialogOpen(false);
      setNoteDisabled(true);
      //If we want to add input box before Note is created. Better response time.
      const newNote: Note = {
        id: 0,
        content: "Loading...",
        lesson: lesson,
        enrollment: {} as Enrollment,
        positionY: mousePositionY + 50,
      };
      const tempNotes = notes;
      tempNotes.push(newNote);
      setNotes(tempNotes);

      const enrollment = await getEnrollByID(String(enrollmentId));
      const result = await createNote(lesson, enrollment, mousePositionY + 50);

      if (result.success) {
        await fetchNotes();
      } else {
        console.error("Failed to create note:", result.error);
      }

      setNoteDisabled(false);
    };
    handleAddNote();
  };

  const handleDeleteNote = async (id: number) => {
    try {
      // Optimistically remove the note from UI
      setNotes((currentNotes) => currentNotes.filter((note) => note.id !== id));

      const result = await deleteNote(id);
      if (!result.ok) {
        // If delete failed, restore the notes from server
        const updatedNotes = await getNotesByAuthorizedUserAndLesson(
          userId,
          lesson.slug,
        );
        setNotes(updatedNotes);
      }
    } catch (error) {
      console.error("Failed to delete note:", error);
      // Restore notes from server on error
      const updatedNotes = await getNotesByAuthorizedUserAndLesson(
        userId,
        lesson.slug,
      );
      setNotes(updatedNotes);
    }
  };

  return (
    <div className="">
      <div className={`mb-10 mt-5 text-center`}>
        <h1 className="text-2xl font-extrabold">My Notes</h1>
        <Badge className="border border-slate-400 bg-sky-100 text-slate-600 hover:bg-sky-100 dark:border-white dark:bg-slate-700 dark:text-white">
          Click anywhere to create a note
        </Badge>
      </div>

      <div
        className="notes-bar relative w-full cursor-pointer space-y-4"
        onClick={(e) => handleMouseClick(e)}
        style={{ height: pageHeight + "px" }}
      >
        <div
          className={`absolute z-[100]`}
          style={{
            top: `${mousePositionY - 60}px`,
            left: `${mousePositionX}%`,
            position: "absolute",
          }}
        >
          <Popover open={dialogOpen}>
            <PopoverTrigger disabled={false}></PopoverTrigger>
            <PopoverContent className="z-[100] w-max p-0">
              <div className="p-0">
                <Button
                  size="sm"
                  onClick={handleAddNote}
                  className="z-[100] justify-center border bg-white text-slate-600 hover:bg-slate-600 hover:text-white dark:border-white dark:bg-slate-700 dark:text-white"
                >
                  Create a Note?
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {notes.map((note) => (
          <div
            key={note.id}
            className={`absolute w-full -translate-y-1/2 transform transition-transform ${draggedNote?.id === note.id ? "cursor-grabbing" : ""} ${focused === note.id ? "z-20" : "z-0"}`}
            style={{
              top: `${note.positionY}px`,
              //top: `${Math.max(0, Math.min(note.positionY, window.innerHeight - 100))}px`, fhseihfhe
              transform: `translateY(-50%)`,
            }}
            onMouseDown={(e) => handleDragStart(note, e)}
          >
            <div
              className={`flex flex-row items-center justify-center ${!focused || focused === note.id ? "opacity-100" : "opacity-30"} ${draggedNote?.id !== note.id ? "scale-100" : "scale-105"}`}
            >
              <NoteBlock
                note={note}
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
