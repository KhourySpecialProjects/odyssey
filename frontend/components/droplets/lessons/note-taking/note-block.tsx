import { Note } from "@/types";
import { useState, useCallback } from "react";
import { updateNoteContent } from "@/lib/requests/notes";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquareText,
  GripVertical,
  Trash2Icon,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";

import { useEditor, EditorContent } from "@tiptap/react";
import Placeholder from "@tiptap/extension-placeholder";
import StartingKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import DefaultToolbar from "@/components/ui/tiptap/toolbar/general-toolbar";
import { cn } from "@/lib/utils";

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
  const [toolbarVisible, setToolbarVisible] = useState(false);
  const [focused, setFocused] = useState(false);

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

  const editor = useEditor({
    extensions: [
      Link,
      Underline,
      StartingKit,
      Placeholder.configure({
        placeholder: "Nothing here yet...",
        emptyEditorClass:
          "cursor-text before:content-[attr(data-placeholder)] before:text-gray-500 dark:before:text-black before:absolute before:top-3 before:left-3 before:pointer-events-none before:select-none",
      }),
    ],

    onUpdate: ({ editor }) => {
      setContent(editor.getHTML());
    },

    content: content,
    editorProps: {
      attributes: {
        class: `w-full min-h-22 bg-white border border-slate-200 dark:border-slate-500 p-3 rounded-br-xl rounded-bl-xl outline-none dark:text-black cursor-text ${content.length > 200 ? "overflow-scroll" : "overflow-hidden"} ${focused ? "max-h-[150px]" : "max-h-[24px]"} overflow-x-hidden`,
      },
      handleKeyDown: (view: any, event: KeyboardEvent) => {
        if (event.key === "Tab") {
          if (view.state.selection.$from.parent.type.name === "codeBlock") {
            event.preventDefault();
            view.dispatch(view.state.tr.insertText("\t"));
            return true;
          }

          return false;
        }
        return false;
      },
    },
    immediatelyRender: false,
    onDestroy: () => {
      //revalidate();
    },
  });

  return (

<div className={cn(
              "mx-3 pt-2 pl-1 pr-1 w-full note-block bg-slate-200  rounded-xl flex flex-row",
              "dark:bg-slate-700 dark:border dark:border-slate-500",
              focused 
              ? "dark:shadow-[0px_0px_16px_rgb(0,255,255)] shadow-[0px_0px_16px_rgb(29,58,138)]" 
              : "dark:shadow-[0px_0px_6px_rgb(0,255,255)] shadow-[0px_0px_8px_rgb(29,58,138)]"
            )} >

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
                className={`inline-block w-fit max-w-[50%] block overflow-hidden text-ellipsis whitespace-nowrap text-center text-slate-700 ${getHighlightColor(note.highlight.color)} hover:text-white dark:hover:bg-slate-800 border dark:hover:border-white`}
              >
                {note.highlight.text.substring(0, 25)}{" "}
                {note.highlight.text.length > 25 ? "..." : ""}
              </Badge>
              <MessageSquareText className="text-slate-[#6c6060] dark:text-slate-300" />
            </div>
          ) : (
            <div className="flex flex-row justify-between w-full">
              <Badge
                variant="secondary"
                className={`text-center text-slate-700 bg-slate-200 border border-slate-400 hover:text-white dark:hover:bg-slate-800`}
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

        <div
          onBlur={() => {
            handleBlur(), onFocus(null), setFocused(false);
          }}
          onFocus={() => {
            onFocus(note.id), setFocused(true);
          }}
        >
          <div className="bg-white dark:bg-slate-800 flex flex-row items-center w-full rounded-tl-md border dark:border-slate-500 rounded-tr-md">
            <div className="flex-grow">
              {toolbarVisible && (
                <DefaultToolbar editor={editor!} note={true} />
              )}
            </div>
            <button
              className={`ml-auto ${toolbarVisible ? "" : "flex flex-row justify-between w-full"} `}
              onClick={() => setToolbarVisible(!toolbarVisible)}
            >
              <div className={`w-full ${toolbarVisible ? 'hidden': ''}`}>

              </div>
              {!toolbarVisible ? (
                <ChevronDown className="dark:bg-slate-800 rounded-tr-md" />
              ) : (
                <ChevronUp className="dark:bg-slate-800 rounded-tr-md" />
              )}
            </button>
          </div>
          <EditorContent name="lesson-generic" editor={editor} />
        </div>
      </div>
    </div>
  );
}
