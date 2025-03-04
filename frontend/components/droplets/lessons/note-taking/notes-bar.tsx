"use client";

import { Enrollment, Lesson, Note } from "@/types";
import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { getNotesByAuthorizedUserAndLesson } from "@/lib/requests/notes";
import { NoteBlock } from "./note-block";
import { getEnrollByID } from "@/lib/requests/enrollment";
import { createNote } from "@/lib/requests/notes";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Trash2Icon } from "lucide-react";
import { deleteNote } from "@/lib/actions";
import { updateNotePosition } from "@/lib/requests/notes";

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
  const [draggedY, setDraggedY] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);

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

      if (newPosition < 300) {
        newPosition = 300;
      }

      const barHeight = document.querySelector(".notes-bar")?.clientHeight;

      if (barHeight && newPosition > barHeight + 50) {
        newPosition = barHeight + 50;
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

    // Remove event listeners immediately
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
    setDraggedY(e.pageY);
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
  const [noteDisabled, setNoteDisabled] = useState(false);
  const [focused, setFocused] = useState<number|null>(null);

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
      // Calculate percentage from top of container
      //setMousePositionY(((e.clientY - rect.top) / rect.height) * 100);
      setMousePositionY(e.pageY);

      const rect = e.currentTarget.getBoundingClientRect();
      const rightOffset = ((rect.right - e.clientX) / rect.width) * 100;
      setMousePositionX(100 - rightOffset); // Position from left edge
      //setMousePositionX(e.pageX);
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
                content: "",
                lesson: lesson,
                enrollment: {} as Enrollment,
                positionY: mousePositionY
            }
            const tempNotes = notes
            tempNotes.push(newNote);
            setNotes(tempNotes)

      const enrollment = await getEnrollByID(String(enrollmentId));
      const result = await createNote(lesson, enrollment, mousePositionY);
      if (result.success) {
        const note = await fetchNotes();
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
    <>
      <div className={`right-[10%] text-center mt-5`}>
        <h1 className="text-2xl font-extrabold ">My Notes</h1>
      </div>

      <div
        className={`space-y-4 w-full h-full relative cursor-pointer notes-bar`}
        onClick={handleMouseClick}
      >

        

          <div
            className={`absolute z-50`}
            style={{
              top: `${mousePositionY - 195}px`,
              left: `${mousePositionX}%`,
              position: "absolute",
            }}
          >
            <Popover open={dialogOpen}>
              <PopoverTrigger disabled={false}></PopoverTrigger>
              <PopoverContent className="w-max p-0">
                <div className="p-0">
                  <Button
                    size="sm"
                    onClick={handleAddNote}
                    className="justify-center bg-white text-slate-600 hover:bg-slate-600 hover:text-white"
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
              className={`absolute w-full transform -translate-y-1/2  transition-transform 
                ${draggedNote?.id === note.id ? "cursor-grabbing" : ""}
                ${focused === note.id ? 'z-20' : 'z-0'}`}
              style={{
                top: `${note.positionY - 220}px`,
                //top: `${Math.max(0, Math.min(note.positionY, window.innerHeight - 100))}px`,
                transform: `translateY(-50%)`,
              }}
              onMouseDown={(e) => handleDragStart(note, e)}
            >
              <div
                className={`flex flex-row justify-center items-center 
                  ${!focused || focused === note.id? 'opacity-100' : 'opacity-30'}
                  ${focused === note.id? 'scale-105' : ''}`}>

                <NoteBlock
                  note={note}
                  onUpdate={fetchNotes}
                  disabled={noteDisabled}
                  onDelete={handleDeleteNote}
                  onFocus={setFocused}
                />
              </div>
            </div>
          ))}
        </div>
    </>
  );
}
