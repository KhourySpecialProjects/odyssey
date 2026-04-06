import { Note } from "@/types";
import { useState, useCallback } from "react";
import { updateNoteContent } from "@/lib/requests/notes";
import { Badge } from "@/components/ui/badge";
import {
  IconChevronDown,
  IconChevronUp,
  IconGripVertical,
  IconTrash,
} from "@tabler/icons-react";
import { stripHtmlTags } from "@/lib/utils";

import { useEditor, EditorContent } from "@tiptap/react";
import Placeholder from "@tiptap/extension-placeholder";
import StartingKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import DefaultToolbar from "@/components/ui/tiptap/toolbar/general-toolbar";
import { cn } from "@/lib/utils";
import { EditorView } from "@tiptap/pm/view";
import { useTheme } from "next-themes";
import Link from "@tiptap/extension-link";

export function NoteBlock({
  note,
  authorizedUserId,
  onUpdate,
  onDelete,
  onFocus,
}: {
  note: Note;
  authorizedUserId: number;
  onUpdate: () => void;
  onDelete: (noteId: number) => void;
  onFocus: (focused: number | null) => void;
}) {
  const [content, setContent] = useState(note.content);
  const [focused, setFocused] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [, setNoteMessage] = useState("Save");

  const handleBlur = useCallback(async () => {
    setNoteMessage("Saving");
    const result = await updateNoteContent(note.id, content, authorizedUserId);
    if (!result.success) {
      console.error("Failed to update note content");
    } else {
      setNoteMessage("Saved");
      onUpdate();
    }
  }, [content, note.id, authorizedUserId, onUpdate]);

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

  const CustomLink = Link.extend({
    addOptions() {
      return {
        ...this.parent?.(),
        autolink: true,
        linkOnPaste: true,
        openOnClick: false,
        HTMLAttributes: {
          rel: "noopener noreferrer",
          target: "_blank",
        },
        validate: (href) => {
          return /^(https?:\/\/)(localhost|127\.0\.0\.1|\d{1,3}(?:\.\d{1,3}){3}|[\w.-]+\.[a-zA-Z]{2,})(:\d+)?(\/\S*)?$/.test(
            href,
          );
        },
      };
    },
  });

  const editor = useEditor({
    extensions: [
      CustomLink,
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
  const { theme } = useTheme();

  const handleSelect = (range: Range) => {
    const startContainer = range.startContainer;
    const startOffset = range.startOffset;
    const endOffset = range.endOffset;

    const isDark = theme === "dark";

    const span = document.createElement("span");
    span.style.backgroundColor = isDark ? "white" : "black";
    span.style.borderRadius = "8px";
    span.style.color = isDark ? "black" : "white";

    span.setAttribute("data-highlight-id", "highlight-id");

    try {
      const contents = range.extractContents();
      while (contents.firstChild) {
        span.appendChild(contents.firstChild);
      }
      range.insertNode(span);
      const newRange = document.createRange();
      newRange.selectNodeContents(span.firstChild || span);

      return newRange;
    } catch (error) {
      console.error("Error applying highlight:", error);
    }
    const newRange = document.createRange();
    newRange.setStart(startContainer, startOffset);
    newRange.setEnd(startContainer, endOffset);
    return newRange;
  };

  const getGeneralNoteLabel = () => {
    if (!content) return "General Note";
    const stripped = stripHtmlTags(content);
    if (!stripped) return "General Note";
    if (stripped.length <= 15) return stripped;
    return stripped.substring(0, 15) + " ...";
  };

  return (
    <div
      className={cn(
        "note-block mr-8 ml-12 flex w-full flex-row rounded-[8px] border bg-white p-2",
        "dark:border-slate-500 dark:bg-slate-700",
        focused
          ? "shadow-[0px_0px_16px_rgb(29,58,138)]"
          : "shadow-[0px_0px_8px_rgb(29,58,138)]",
      )}
    >
      <div className="flex w-4/5 flex-1 flex-col px-1 py-2">
        <div className="flex flex-row items-center pb-2">
          <div className="grip-handle pr-2">
            <IconGripVertical className="h-4 w-4" />
          </div>
          {note.highlight?.text ? (
            <div className="flex w-full flex-row justify-between">
              <Badge
                variant="secondary"
                title={note.highlight.text}
                onClick={async () => {
                  const contentElement = document.querySelector(".prose");
                  if (!contentElement) {
                    return;
                  }

                  const walker = document.createTreeWalker(
                    contentElement,
                    NodeFilter.SHOW_TEXT,
                  );

                  let currentPosition = 0;

                  let node = walker.nextNode();
                  while (node) {
                    const nodeLength = node.textContent?.length || 0;
                    const nodeText = node.textContent || "";

                    if (currentPosition === note.highlight?.position.start) {
                      const startIndex = nodeText.indexOf(
                        note.highlight?.text || "",
                      );
                      if (startIndex === -1) {
                        console.warn(
                          "Could not find highlight text in node:",
                          nodeText,
                        );
                        return;
                      }
                      const range = document.createRange();
                      range.setStart(node, startIndex);
                      range.setEnd(
                        node,
                        startIndex + note.highlight.text.length,
                      );
                      handleSelect(range);

                      setTimeout(() => {
                        const span = document.querySelector(
                          `span[data-highlight-id="highlight-id"]`,
                        );
                        if (!span || !span.parentNode) return;

                        const parent = span.parentNode;

                        const textNode = document.createTextNode(
                          span.textContent || "",
                        );
                        parent.replaceChild(textNode, span);
                        parent.normalize();
                      }, 1000);
                      break;
                    }

                    currentPosition += nodeLength;
                    node = walker.nextNode();
                  }
                }}
                className={`block w-fit max-w-[50%] overflow-hidden text-center text-ellipsis whitespace-nowrap text-slate-700 ${getHighlightColor(note.highlight.color)} border hover:text-white dark:hover:border-white dark:hover:bg-slate-800`}
              >
                {note.highlight.text.substring(0, 25)}{" "}
                {note.highlight.text.length > 25 ? "..." : ""}
              </Badge>
            </div>
          ) : (
            <div className="flex w-full flex-row justify-start">
              {!expanded && (
                <span className="text-sm text-slate-500">
                  {getGeneralNoteLabel()}
                </span>
              )}
              {expanded && (
                <span className="text-sm font-medium text-slate-600">
                  General Note
                </span>
              )}
            </div>
          )}

          <button
            type="button"
            className="chevron-toggle ml-auto cursor-pointer p-1 text-slate-500 transition-colors hover:text-slate-700"
            onClick={() => setExpanded((prev) => !prev)}
            aria-label={expanded ? "Collapse note" : "Expand note"}
            data-testid={expanded ? "chevronup" : "chevrondown"}
          >
            {expanded ? (
              <IconChevronUp className="h-4 w-4" />
            ) : (
              <IconChevronDown className="h-4 w-4" />
            )}
          </button>

          <div
            role="button"
            className="trash-icon ml-2 cursor-pointer rounded bg-red-700 p-1 text-white transition-colors hover:bg-red-800"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(note.id);
            }}
            data-testid="deleteNote"
          >
            <IconTrash className="h-4 w-4" />
          </div>
        </div>

        {expanded && (
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
            </div>
            <EditorContent
              name="lesson-generic"
              editor={editor}
              data-testid="editor"
            />
          </div>
        )}
      </div>
    </div>
  );
}
