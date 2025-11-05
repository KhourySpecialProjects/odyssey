import { DefaultReactSuggestionItem } from "@blocknote/react";

const createCalloutItem = (
  editor: any,
  type: string,
  title: string,
  aliases: string[],
  subtext: string,
) => ({
  title,
  onItemClick: () => {
    editor.insertBlocks(
      [{ type: "callout", props: { calloutType: type } }],
      editor.getTextCursorPosition().block,
      "after",
    );
  },
  aliases,
  group: "Callouts",
  subtext,
});

export const getCalloutSlashMenuItems = (
  editor: any,
): DefaultReactSuggestionItem[] => [
  createCalloutItem(
    editor,
    "warning",
    "Warning",
    ["warning", "warn", "alert"],
    "Pink warning callout",
  ),
  createCalloutItem(
    editor,
    "question",
    "Question",
    ["question", "q", "help"],
    "Blue question callout",
  ),
  createCalloutItem(
    editor,
    "important",
    "Important",
    ["important", "imp", "key"],
    "Orange important callout",
  ),
  createCalloutItem(
    editor,
    "definition",
    "Definition",
    ["definition", "def", "define"],
    "Green definition callout",
  ),
  createCalloutItem(
    editor,
    "more-information",
    "More Information",
    ["more", "info", "more information", "additional"],
    "Purple info callout",
  ),
  createCalloutItem(
    editor,
    "caution",
    "Caution",
    ["caution", "careful", "watch"],
    "Yellow caution callout",
  ),
  createCalloutItem(
    editor,
    "default",
    "Default Callout",
    ["callout", "default", "note"],
    "Gray default callout",
  ),
];
