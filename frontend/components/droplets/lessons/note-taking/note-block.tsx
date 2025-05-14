import { Note } from "@/types";
import { useState, useCallback } from "react";
import { updateNoteContent } from "@/lib/requests/notes";
import { Badge } from "@/components/ui/badge";
import { GripVertical, Trash2Icon, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

import { useEditor, EditorContent } from "@tiptap/react";
import Placeholder from "@tiptap/extension-placeholder";
import StartingKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import DefaultToolbar from "@/components/ui/tiptap/toolbar/general-toolbar";
import { cn } from "@/lib/utils";
import { EditorView } from "@tiptap/pm/view";

export function NoteBlock({
  note,
  onUpdate,
  onDelete,
  onFocus,
}: {
  note: Note;
  onUpdate: () => void;
  onDelete: (noteId: number) => void;
  onFocus: (focused: number | null) => void;
}) {
  const [content, setContent] = useState(note.content);
  const [noteExpanded, setNoteExpanded] = useState(true);
  const [focused, setFocused] = useState(false);
  const [, setNoteMessage] = useState("Save");

  const handleBlur = useCallback(async () => {
    setNoteMessage("Saving");
    const result = await updateNoteContent(note.id, content);
    if (!result.success) {
      console.error("Failed to update note content");
    } else {
      setNoteMessage("Saved");
      onUpdate();
    }
  }, [content, note.id, onUpdate]);

  function stripHtml(html: string): string {
    if (!html) return "General Note";
    const div = document.createElement("div");
    div.innerHTML = html;
    return div.textContent || div.innerText || "General Note";
  }

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
        placeholder: "Type something...",
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
      handleKeyDown: (view: EditorView, event: KeyboardEvent) => {
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
  });

  const handleSelect = (range: Range, color: string) => {
    const span = document.createElement("span");
    span.style.backgroundColor = color;
    span.style.borderRadius = "8px";
    span.style.color = "black";
    span.style.display = "inline"; 
    span.style.padding = "2px"; 

    try {
      const contents = range.extractContents();
      while (contents.firstChild) {
        span.appendChild(contents.firstChild);
      }
      range.insertNode(span);
     
      span.offsetHeight;
      
        setTimeout(() => {
          const textNode = document.createTextNode(span.textContent || "");
          span.parentNode?.replaceChild(textNode, span);
          }, 1000);
      
      return
      
    } catch (error) {
      console.error("Error applying highlight:", error);
    }
  }

  return (
    <div
      className={cn(
        "note-block mx-3 flex w-full flex-row rounded-xl bg-slate-200 pt-2 pr-1 pl-1",
        "dark:border dark:border-slate-500 dark:bg-slate-700",
        focused
          ? "shadow-[0px_0px_16px_rgb(29,58,138)] dark:shadow-[0px_0px_16px_rgb(0,255,255)]"
          : "shadow-[0px_0px_8px_rgb(29,58,138)] dark:shadow-[0px_0px_6px_rgb(0,255,255)]",
      )}
    >
      <div className="flex w-4/5 flex-1 flex-col px-1 py-2">
        <div className="flex flex-row items-center pb-2">
          <div className="grip-handle pr-2">
            <GripVertical />
          </div>
          {note.highlight?.text ? (
            <div className="flex w-full flex-row justify-between">
              <Badge
                variant="secondary"
                title={note.highlight.text}
                onClick={async () => {
                    const contentElement = document.querySelector('.prose');
                    if (!contentElement) {
                      return;
                    }

                    
                    const walker = document.createTreeWalker(
                      contentElement,
                      NodeFilter.SHOW_TEXT
                    );

                    let currentPosition = 0;

                    let node = walker.nextNode();
                    while (node) {
                      const nodeLength = node.textContent?.length || 0;
                      const nodeText = node.textContent || "";

                      if (currentPosition === note.highlight?.position.start) {
                        const startIndex = nodeText.indexOf(note.highlight?.text || "");
                        const range = document.createRange();
          range.setStart(node, startIndex);
          range.setEnd(node, startIndex + note.highlight.text.length);

          handleSelect(range, "black")


          
                      }

                      currentPosition += nodeLength;
                      node = walker.nextNode();
                    }

                  }
                }
                className={`block w-fit max-w-[50%] overflow-hidden text-center text-ellipsis whitespace-nowrap text-slate-700 ${getHighlightColor(note.highlight.color)} border hover:text-white dark:hover:border-white dark:hover:bg-slate-800`}
              >
                {note.highlight.text.substring(0, 25)}{" "}
                {note.highlight.text.length > 25 ? "..." : ""}
              </Badge>
            </div>
          ) : (
            <div className="flex w-full flex-row justify-start">
              <Badge
                variant="secondary"
                className={`border border-slate-400 bg-slate-200 py-1 text-center text-sm text-slate-700 hover:bg-slate-200`}
              >
                {noteExpanded ? (
                  "General Note"
                ) : (
                  <>
                    {stripHtml(content).substring(0, 15)}
                    {stripHtml(content).length > 15 ? "..." : ""}
                  </>
                )}
              </Badge>
            </div>
          )}

          <button
            className={`ml-auto ${noteExpanded ? "" : "flex w-full flex-row justify-between"} `}
            onClick={() => setNoteExpanded(!noteExpanded)}
          >
            <div className={`w-full ${noteExpanded ? "hidden" : ""}`}></div>
            {!noteExpanded ? (
              <ChevronDown
                className="rounded-tr-md dark:bg-slate-700"
                data-testid="chevrondown"
              />
            ) : (
              <ChevronUp
                className="rounded-tr-md dark:bg-slate-700"
                data-testid="chevronup"
              />
            )}
          </button>

          <Button
            className="trash-icon mb-1 ml-2 h-full bg-red-700 p-0 hover:bg-red-900 dark:bg-red-700 dark:hover:bg-red-900"
            variant="default"
            size="sm"
            onClick={() => onDelete(note.id)}
            role="button"
            name="delete"
            data-testid="deleteNote"
          >
            <Trash2Icon className="cursor-pointer text-white" />
          </Button>
        </div>

        {noteExpanded ? (
          <div
            onBlur={() => {
              handleBlur();
              onFocus(null);
              setFocused(false);
            }}
            onFocus={() => {
              onFocus(note.id);
              setFocused(true);
            }}
          >
            <div className="flex w-full flex-row items-center rounded-tl-md rounded-tr-md border bg-white dark:border-slate-500 dark:bg-slate-800">
              <div className="flex-grow" data-testid="toolbar">
                <DefaultToolbar editor={editor!} note={true} />
              </div>
              {/*<Button 
                variant="outline" 
                size="sm" 
                className="h-full bg-slate-200 rounded-md mr-4 dark:bg-slate-700 dark:border-white"
                onClick={handleBlur} >
                  {noteMessage}
              </Button>*/}
            </div>
            <EditorContent
              name="lesson-generic"
              editor={editor}
              data-testid="editor"
            />
          </div>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}
