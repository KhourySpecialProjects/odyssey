import { Note } from "@/types";
import { useState, useEffect, useCallback } from "react";
import { ChangeEvent } from "react";
import { updateNoteContent } from "@/lib/requests/notes";


export function NoteBlock({ note, onUpdate }: { note: Note; onUpdate: () => void }) {

    const [content, setContent] = useState(note.content)

    const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
        const searchTerm = e.target.value;
        setContent(searchTerm);
    }

    const handleBlur = useCallback(async () => {
        const result = await updateNoteContent(note.id, content);
        if (!result.success) {
          console.error("Failed to update note content");
        } else {
          onUpdate();
        }
      }, [content, note.id, onUpdate]);


    return (
        <div className="p-4 max-w-sm mx-auto w-full">
      <textarea
        id="simple-input"
        value={content}
        onChange={(e) => {handleInputChange(e)
            e.target.style.height = 'auto'; // Reset the height
            e.target.style.height = `${e.target.scrollHeight}px`; // Adjust height
        }}
        onBlur={handleBlur}
        className="w-full p-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
        placeholder="Type something..."
      />
    </div>
    )


}