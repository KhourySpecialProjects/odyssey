"use client";
import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import {
  useCreateBlockNote,
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import "./custom-blocknote.css";
import { Callout } from "@/components/ui/blocknote/blocks/callout-block";
import { TrueFalseQuiz } from "@/components/ui/blocknote/blocks/quiz-true-false-block";
import { OpenEndedQuiz } from "@/components/ui/blocknote/blocks/quiz-open-ended-block";
import { MultipleChoiceQuiz } from "@/components/ui/blocknote/blocks/quiz-multiple-choice-block";
import {
  getCalloutSlashMenuItems,
  getQuizSlashMenuItems,
} from "@/components/ui/blocknote/editor/slash-menu-config";
import { useTheme } from "next-themes";

export default function BlockNoteTestEditor() {
  const { resolvedTheme } = useTheme();

  const editor = useCreateBlockNote({
    schema: BlockNoteSchema.create({
      blockSpecs: {
        ...defaultBlockSpecs,
        callout: Callout(),
        "quiz-true-false": TrueFalseQuiz(),
        "quiz-open-ended": OpenEndedQuiz(),
        "quiz-multiple-choice": MultipleChoiceQuiz(),
      },
    }),
  });

  const getCustomSlashMenuItems = (editor: any) => [
    ...getDefaultReactSlashMenuItems(editor),
    ...getCalloutSlashMenuItems(editor),
    ...getQuizSlashMenuItems(editor),
  ];

  return (
    <div style={{ width: "100%", maxWidth: "900px", minHeight: "500px" }}>
      <BlockNoteView
        editor={editor}
        slashMenu={false}
        theme={resolvedTheme === "dark" ? "dark" : "light"}
        data-quiz-blocks
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
