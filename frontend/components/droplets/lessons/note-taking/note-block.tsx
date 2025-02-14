import { Note } from "@/types";
import { useState, useEffect, useCallback } from "react";
import { ChangeEvent } from "react";
import { updateNoteContent } from "@/lib/requests/notes";
import { Badge } from "@/components/ui/badge";
import { File, MessageSquareText } from "lucide-react";

export function NoteBlock({
  note,
  onUpdate,
  disabled,
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

  console.log("text is ", note.highlight);
  console.log("color is ", note.highlight?.color);

  const getHighlightColor = (color: string | undefined) => {
    switch (color) {
      case "yellow":
        return "bg-yellow-300";
      case "#f9a8d4":
        return "bg-pink-300";
      case "#fca5a5":
        return "bg-red-300";
      case "#86efac":
        return "bg-green-300";
      case "#93c5fd":
        return "bg-blue-300";
      default:
        return "bg-yellow-300";
    }
  };

  return (
    <div className=" mx-2 pt-2 px-2 w-4/5 note-block bg-slate-200 rounded-xl">
      <div className="pb-1 flex flex-row">
        {note.highlight?.text ? (
          <div className="flex flex-row justify-between w-full">
            <Badge
              variant="secondary"
              title={note.highlight.text}
              className={`inline-block w-fit max-w-[85%] block overflow-hidden text-ellipsis whitespace-nowrap text-center text-slate-700 ${getHighlightColor(note.highlight.color)} hover:text-white`}
            >
              {note.highlight.text}
            </Badge>
            <MessageSquareText color="#6c6060" />
          </div>
        ) : (
          <div className="flex flex-row justify-end w-full">
            <File color="#6c6060" />
          </div>
        )}
      </div>

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
        style={{
          resize: "none",
        }}
      />
    </div>
  );
}
