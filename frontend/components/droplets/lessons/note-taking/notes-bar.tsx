
"use client";

import { Lesson, OpenEndedQuizQuestion, Note } from "@/types";
import { ExpandableEditor } from "@/components/draft/lesson/blocks/expandable";
import { VideoEditor } from "@/components/draft/lesson/blocks/video";
import { CalloutEditor } from "@/components/draft/lesson/blocks/callout";
import { GenericEditor } from "@/components/draft/lesson/blocks/generic";
import { AddBlock } from "@/components/draft/lesson/add-block";
import { useState, useCallback, useEffect, useRef } from "react";
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


interface NotesBarProps {
    notes: Note[];
}

export function NotesBar({
    userId,
    lesson,
    enrollmentId
}: {
    userId: number;
    lesson: Lesson,
    enrollmentId: string | undefined
}) {
    const [notes, setNotes] = useState<Note[]>([]);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [mousePositionY, setMousePositionY] = useState(0);
    const [mousePositionX, setMousePositionX] = useState(0);
    const [selectedNote, setSelectedNote] = useState(false);

    if (!enrollmentId) {
        enrollmentId = ""
    }

    const fetchNotes = useCallback(async () => {
        const fetchedNotes = await getNotesByAuthorizedUserAndLesson(userId, lesson.slug);
        console.log("got the new notes", fetchedNotes)
        setNotes(fetchedNotes);
    }, [userId, lesson.slug]);

    useEffect(() => {
        fetchNotes();
    }, [fetchNotes]);

    const handleMouseClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        // Calculate percentage from top of container

        setMousePositionY(((e.clientY - rect.top) / rect.height) * 100);

        const rightOffset = ((rect.right - e.clientX) / rect.width) * 100;
        setMousePositionX(100 - rightOffset); // Position from left edge

        if (selectedNote === false) {
            setDialogOpen(!dialogOpen);
        }

        setSelectedNote(false);


        console.log("mouse x is ", mousePositionX)
    }


    const handleAddNote = () => {

        const handleAddNote = async () => {
            console.log("got here!", lesson)
            const enrollment = await getEnrollByID(String(enrollmentId));
            const result = await createNote(lesson, enrollment, mousePositionY)
            console.log("created it!")
        }
        handleAddNote();
    }

    return (
        <>

            <div className="space-y-4 w-full h-full relative bg-blue-100"
                onClick={handleMouseClick}>

                <div
                    className={`absolute transform -translate-y-1/2`}
                    style={{
                        top: `${mousePositionY}%`,
                        left: `${mousePositionX}%`,
                    }}
                >
                    <Popover open={dialogOpen}>
                        <PopoverTrigger disabled={false}>

                        </PopoverTrigger>
                        <PopoverContent>
                            <Button
                                variant="ghost"
                                onClick={handleAddNote}>
                                Create a Note?
                            </Button>
                        </PopoverContent>
                    </Popover>

                </div>

                {notes.map((note, index) => (
                    <div
                        key={index}
                        className={`absolute w-full transform -translate-y-1/2`}
                        style={{ top: `${note.positionY}%` }}
                    >
                        <NoteBlock note={note} onUpdate={fetchNotes} />
                    </div>
                ))}
            </div>




        </>
    );
}