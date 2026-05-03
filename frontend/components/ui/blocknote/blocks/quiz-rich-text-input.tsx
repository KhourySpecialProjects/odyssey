"use client";

import { useEffect, useRef } from "react";
import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { useTheme } from "next-themes";
import "@blocknote/mantine/style.css";

const quizSchema = BlockNoteSchema.create({
  blockSpecs: {
    paragraph: defaultBlockSpecs.paragraph,
    codeBlock: defaultBlockSpecs.codeBlock,
  },
});

interface QuizRichTextInputProps {
  value: string;
  onChange: (html: string) => void;
  minHeight?: string;
}

export function QuizRichTextInput({
  value,
  onChange,
  minHeight = "60px",
}: QuizRichTextInputProps) {
  const { resolvedTheme } = useTheme();
  const editor = useCreateBlockNote({ schema: quizSchema });
  const initialized = useRef(false);
  const lastEmittedHtml = useRef<string>(value);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    if (!value?.trim()) return;

    const blocks = editor.tryParseHTMLToBlocks(value);
    editor.replaceBlocks(editor.document, blocks);
    // Re-sync so the onChange triggered by replaceBlocks doesn't propagate
    // up as a user edit.
    lastEmittedHtml.current = editor.blocksToHTMLLossy(editor.document);
    // Only runs once on mount — value changes after mount are user-driven
    // and handled by the editor itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="quiz-rich-text-input overflow-hidden rounded-md border border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800"
      style={{ minHeight }}
      // Prevent the outer BlockNote editor from intercepting mouse events
      onMouseDown={(e) => e.stopPropagation()}
    >
      <BlockNoteView
        editor={editor}
        slashMenu={false}
        theme={resolvedTheme === "dark" ? "dark" : "light"}
        onChange={() => {
          const html = editor.blocksToHTMLLossy(editor.document);
          if (html !== lastEmittedHtml.current) {
            lastEmittedHtml.current = html;
            onChange(html);
          }
        }}
      />
    </div>
  );
}
