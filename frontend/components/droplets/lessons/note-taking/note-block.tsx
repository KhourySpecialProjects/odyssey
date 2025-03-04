import { Note } from "@/types";
import { useState, useCallback } from "react";
import { ChangeEvent } from "react";
import { updateNoteContent } from "@/lib/requests/notes";
import { Badge } from "@/components/ui/badge";
import { MessageSquareText, GripVertical, Trash2Icon, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NoteBlock({
  note,
  onUpdate,
  disabled,
  onDelete,
  onFocus,
}: {
  note: Note;
  onUpdate: () => void;
  disabled: boolean;
  onDelete: (noteId: number) => void;
  onFocus: (focused: number | null) => void;
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

  const getHighlightColor = (color: string | undefined) => {
    switch (color) {
      case "#f9a8d4":
        return "bg-[#f9a8d4]";
      case "#fbd38d":
        return "bg-[#fbd38d]";
      case "#fff300":
        return "bg-[#fff300]";
      case "#86efac":
        return "bg-[#86efac]";
      case "#93c5fd":
        return "bg-[#93c5fd]";
      default:
        return "bg-[#fff300]";
    }
  };


  return (
    <div
      className="mx-3 pt-2 pl-2 pr-2 w-full note-block bg-slate-200 dark:bg-slate-800 dark:border dark:border-slate-500 rounded-xl flex flex-row">


      <div className="flex-1 flex flex-col w-4/5 py-2 px-1">
        <div className="pb-2 flex flex-row items-center">
          <div className="grip-handle pr-2">
            <GripVertical />
          </div>
          {note.highlight?.text ? (
            <div className="flex flex-row justify-between w-full">
              <Badge
                variant="secondary"
                title={note.highlight.text}
                className={`inline-block w-fit max-w-[50%] block overflow-hidden text-ellipsis whitespace-nowrap text-center text-slate-700 ${getHighlightColor(note.highlight.color)} hover:text-white`}
              >
                {note.highlight.text.substring(0,25)} {note.highlight.text.length > 25 ? "..." : ""}
              </Badge>
              <MessageSquareText className="text-slate-[#6c6060] dark:text-slate-300" />
              
            </div>
          ) : (

            <div className="flex flex-row justify-between w-full">

              <Badge
                variant="secondary"
                className={`text-center text-slate-700 bg-slate-200 border border-slate-400 hover:text-white`}
              >
                General Note
              </Badge>

              <FileText className="text-slate-[#6c6060] dark:text-slate-300" />
            </div>

          )}

          <Button
              className="p-0 mb-1 ml-2 h-full bg-red-700 dark:bg-red-700 hover:bg-red-900 dark:hover:bg-red-900 trash-icon"
              variant="default"
              size="sm"
              onClick={() => onDelete(note.id)}
            >
              <Trash2Icon className="cursor-pointer text-white" />
            </Button>
            

        </div>

        <textarea
          id="simple-input"
          value={content}
          disabled={disabled}
          onChange={(e) => {
            //e.target.style.height = `${e.target.scrollHeight}px`
            e.target.style.height = `${Math.ceil(e.target.scrollHeight / 24) * 24}px`;

            if (e.target.scrollHeight > 200) {
              e.target.style.overflowY = "auto"
            }
            handleInputChange(e);
          }}
          onBlur={(e) => {
            onFocus(null);
            e.target.style.height = `60px`
            e.target.style.overflowY = "hidden"
            handleBlur();
          }}
          onFocus={(e) => {
            onFocus(note.id);
            e.target.style.height = `${e.target.scrollHeight}px`
            if (e.target.scrollHeight > 200) {
              e.target.style.overflowY = "auto"
            }
          }}

          className={`p-2 border-slate-300 dark:text-black rounded-tl-xl rounded-bl-xl focus:outline-none focus:border-slate-400 focus:ring-0 transition-all duration-200`}
          placeholder="Type something..."

          rows={2}
          style={{
            resize: "none",
            width: "100%",
            height: "60px",
            boxSizing: "border-box",
            overflow: "hidden",
            lineHeight: "24px",
            maxHeight: "200px",
          }}
        />
      </div>
    </div>
  );
}
