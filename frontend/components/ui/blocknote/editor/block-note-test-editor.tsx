"use client";

import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import {
  useCreateBlockNote,
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { Callout } from "@/components/ui/blocknote/blocks/callout-block";
import { getCalloutSlashMenuItems } from "@/components/ui/blocknote/editor/slash-menu-config";
import { useTheme } from "next-themes";

export default function BlockNoteTestEditor() {
  const { theme } = useTheme(); // Get Odyssey's theme

  const editor = useCreateBlockNote({
    schema: BlockNoteSchema.create({
      blockSpecs: {
        ...defaultBlockSpecs,
        callout: Callout(),
      },
    }),
  });

  const getCustomSlashMenuItems = (editor: any) => [
    ...getDefaultReactSlashMenuItems(editor),
    ...getCalloutSlashMenuItems(editor),
  ];

  return (
    <div style={{ width: "100%", maxWidth: "900px", minHeight: "500px" }}>
      <BlockNoteView
        editor={editor}
        slashMenu={false}
        theme={theme === "dark" ? "dark" : "light"}
      >
        <SuggestionMenuController
          triggerCharacter="/"
          getItems={async (query) =>
            getCustomSlashMenuItems(editor).filter(
              (item) =>
                item.title.toLowerCase().includes(query.toLowerCase()) ||
                item.aliases?.some((alias) =>
                  alias.toLowerCase().includes(query.toLowerCase()),
                ),
            )
          }
        />
      </BlockNoteView>
    </div>
  );
}
