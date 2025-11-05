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

export default function BlockNoteTestEditor() {
  const editor = useCreateBlockNote({
    schema: BlockNoteSchema.create({
      blockSpecs: {
        ...defaultBlockSpecs,
        callout: Callout(),
      },
    }),
  });

  const getCustomSlashMenuItems = (editor: typeof editor) => [
    ...getDefaultReactSlashMenuItems(editor),
    ...getCalloutSlashMenuItems(editor),
  ];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <BlockNoteView editor={editor} slashMenu={false}>
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
