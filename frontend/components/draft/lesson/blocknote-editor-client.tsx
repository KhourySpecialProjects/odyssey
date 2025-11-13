"use client";

import { useEffect } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { blockNoteSchema } from "@/lib/blocknote/schema";
import { useTheme } from "next-themes";
import {
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
} from "@blocknote/react";
import { getCalloutSlashMenuItems } from "@/components/ui/blocknote/editor/slash-menu-config";
import { getQuizSlashMenuItems } from "@/components/ui/blocknote/editor/slash-menu-config";

interface BlockNoteEditorClientProps {
  initialContent?: any;
  onChange: (content: any) => void;
}

export function BlockNoteEditorClient({
  initialContent,
  onChange,
}: BlockNoteEditorClientProps) {
  const { resolvedTheme } = useTheme();

  const editor = useCreateBlockNote({
    schema: blockNoteSchema,
    initialContent: initialContent || undefined,
  });

  useEffect(() => {
    const handleChange = async () => {
      const content = editor.document;
      onChange(content);
    };

    editor.onChange(handleChange);
  }, [editor, onChange]);

  return (
    <div className="w-full rounded-lg border border-slate-200 dark:border-slate-700">
      <BlockNoteView
        editor={editor}
        theme={resolvedTheme === "dark" ? "dark" : "light"}
        slashMenu={false}
      >
        <SuggestionMenuController
          triggerCharacter="/"
          getItems={async (query) => {
            const defaultItems = getDefaultReactSlashMenuItems(editor);
            const calloutItems = getCalloutSlashMenuItems(editor);
            const quizItems = getQuizSlashMenuItems(editor);

            const allItems = [...defaultItems, ...calloutItems, ...quizItems];

            return allItems.filter((item) =>
              item.title.toLowerCase().includes(query.toLowerCase()),
            );
          }}
        />
      </BlockNoteView>
    </div>
  );
}
