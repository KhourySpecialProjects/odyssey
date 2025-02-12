import { Note } from "@/types";
import { useState, useEffect, useCallback } from "react";
import { ChangeEvent } from "react";
import { updateNoteContent } from "@/lib/requests/notes";

export function NoteBlock({
  note,
  onUpdate,
  disabled
}: {
  note: Note;
  onUpdate: () => void;
  disabled: boolean;
}) {
  const [content, setContent] = useState(note.content);

  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const searchTerm = e.target.value;
    setContent(searchTerm);
  };

  const handleBlur = useCallback(async () => {
    const result = await updateNoteContent(note.id, content);
    if (!result.success) {
      console.error("Failed to update note content");
    } else {
      onUpdate();
    }
  }, [content, note.id, onUpdate]);

  return (
    <div className=" mx-4 pt-2 px-2 w-3/4 note-block bg-slate-200 rounded-xl">
     
      <textarea
        id="simple-input"
        value={content}
        disabled={disabled}
        onChange={(e) => {
          handleInputChange(e);
          e.target.style.height = "auto"; // Reset the height
          e.target.style.height = `${e.target.scrollHeight}px`; // Adjust height
        }}
        onBlur={handleBlur}
        className=" w-full p-2 border-slate-300 rounded-xl focus:outline-none focus:border-slate-400 focus:ring-0 shadow-sm"
        placeholder="Type something..."
        rows={2}
        
      />
    </div>
  );
}
