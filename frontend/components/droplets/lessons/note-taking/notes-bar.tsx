"use client";

import { Lesson, Note } from "@/types";
import { useState, useCallback, useEffect, useRef, useReducer } from "react";
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mousePositionY, setMousePositionY] = useState(0);
  const [mousePositionX, setMousePositionX] = useState(0);
  const [selectedNote, setSelectedNote] = useState(false);
  const [noteDisabled, setNoteDisabled] = useState(false);

  if (!enrollmentId) {
    enrollmentId = "";
  }

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
      /*const newNote: Note = {
                id: 0,
                content: "",
                lesson: lesson,
                enrollment: {} as Enrollment,
                positionY: mousePositionY
            }
            const tempNotes = notes
            tempNotes.push(newNote);
            setNotes(tempNotes)*/

      const enrollment = await getEnrollByID(String(enrollmentId));
      const result = await createNote(lesson, enrollment, mousePositionY);
      if (result.success) {
        const note = await fetchNotes();
        setNoteDisabled(false);
      }
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
      <div className={`fixed right-[10%] text-center mt-5`}>
                <h1 className="text-2xl font-extrabold ">My Notes</h1>
            </div>
      <div
        className="space-y-4 w-full h-full relative cursor-pointer"
        onClick={handleMouseClick}
      >
        <div
          className={`absolute z-50`}
          style={{
            top: `${mousePositionY - 90}px`,
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
            className={`absolute w-full transform -translate-y-1/2`}
            style={{ top: `${note.positionY - 90}px` }}
          >
            <div className="flex flex-row justify-center items-center">
              <NoteBlock
                note={note}
                onUpdate={fetchNotes}
                disabled={noteDisabled}
              />
              <Button
                className="px-auto mb-1 bg-red-700 p-0 hover:bg-red-900 trash-icon"
                variant="default"
                size="sm"
                onClick={() => {
                  handleDeleteNote(note.id);
                }}
              >
                <Trash2Icon className="cursor-pointer text-white" size={30} />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
