"use client";

import { Lesson, OpenEndedQuizQuestion, Note, Enrollment } from "@/types";
import { ExpandableEditor } from "@/components/draft/lesson/blocks/expandable";
import { VideoEditor } from "@/components/draft/lesson/blocks/video";
import { CalloutEditor } from "@/components/draft/lesson/blocks/callout";
import { GenericEditor } from "@/components/draft/lesson/blocks/generic";
import { AddBlock } from "@/components/draft/lesson/add-block";
import { useState, useCallback, useEffect, useRef, useReducer } from "react";
import { debounce } from "lodash";
import { updateLesson, deleteLesson } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { htmlToText } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DeleteLessonButton } from "@/components/draft/lesson/delete-lesson";
import { useTransition } from "react";
import { useMemo } from "react";
import { LessonNameInput } from "@/components/ui/tiptap/lesson-name-input";
import { QuizEditor } from "@/components/draft/lesson/blocks/quiz";
import { QuizQuestion } from "@/types";
import { OpenEndedQuizEditor } from "@/components/draft/lesson/blocks/open-ended-quiz";
import { getNotesByAuthorizedUserAndLesson } from "@/lib/requests/notes";
import { NoteBlock } from "./note-block";
import { getLessonBySlug } from "@/lib/requests/lesson";
import { getEnrollByID } from "@/lib/requests/enrollment";
import { createNote } from "@/lib/requests/notes";
import {
    Popover,
    PopoverClose,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Trash2Icon } from "lucide-react";
import { deleteNote } from "@/lib/actions";

export function NotesBar({
    userId,
    lesson,
    enrollmentId,
}: {
    userId: number;
    lesson: Lesson;
    enrollmentId: string | undefined;
}) {
    const [notes, setNotes] = useState<Note[]>([]);
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
            // Calculate percentage from top of container
            setMousePositionY(((e.clientY - rect.top) / rect.height) * 100);
            const rightOffset = ((rect.right - e.clientX) / rect.width) * 100;
            setMousePositionX(100 - rightOffset); // Position from left edge
            setDialogOpen(!dialogOpen);
        }
        setSelectedNote(false);
    };

    const handleAddNote = () => {
        const handleAddNote = async () => {
            setDialogOpen(false);
            setNoteDisabled(true);
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
                setNoteDisabled(false);
            }
        };
        handleAddNote();
    };

    const handleDeleteNote = async (id: number) => {
        try {
            // Optimistically remove the note from UI
            setNotes(currentNotes => currentNotes.filter(note => note.id !== id));

            const result = await deleteNote(id);
            if (!result.ok) {
                // If delete failed, restore the notes from server
                const updatedNotes = await getNotesByAuthorizedUserAndLesson(userId, lesson.slug);
                setNotes(updatedNotes);
            }
        } catch (error) {
            console.error("Failed to delete note:", error);
            // Restore notes from server on error
            const updatedNotes = await getNotesByAuthorizedUserAndLesson(userId, lesson.slug);
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
                    className={`absolute`}
                    style={{
                        top: `${mousePositionY - 1.5}%`,
                        left: `${mousePositionX - 15}%`,
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
                        style={{ top: `${note.positionY}%` }}
                    >
                        <div className="flex flex-row justify-center items-center">
                            <NoteBlock note={note} onUpdate={fetchNotes} disabled={noteDisabled} />
                            {!noteDisabled &&
                            <Button className="mr-2 mb-1 bg-red-700 flex justify-start hover:bg-red-900 trash-icon" variant="default" size="sm">
                                <Trash2Icon
                                    className="cursor-pointer text-white"
                                    onClick={() => {
                                        handleDeleteNote(note.id);
                                    }}
                                    size={30}
                                />
                            </Button>
                            }
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}
