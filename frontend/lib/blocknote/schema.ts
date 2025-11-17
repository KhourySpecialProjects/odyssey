"use client";

import {
  Block,
  BlockNoteEditor as CoreBlockNoteEditor,
  BlockNoteSchema,
  PartialBlock,
  defaultBlockSpecs,
  defaultStyleSpecs,
} from "@blocknote/core";
import { Callout } from "@/components/ui/blocknote/blocks/callout-block";
import { TrueFalseQuiz } from "@/components/ui/blocknote/blocks/quiz-true-false-block";
import { OpenEndedQuiz } from "@/components/ui/blocknote/blocks/quiz-open-ended-block";
import { MultipleChoiceQuiz } from "@/components/ui/blocknote/blocks/quiz-multiple-choice-block";

// Exclude specific block types from the block type selector dropdown
// Available block types: paragraph, heading, bulletListItem, numberedListItem,
// toggleListItem, checklistItem, codeBlock, image, video, table, quote, etc.
// Add block type names to this array to remove them from the dropdown
const blockTypesToHide = new Set([
  "quote", // Quote block (also prevents Tab key from inserting quotes)
  "toggleListItem", // Toggle List
  "checklistItem", // Check List
  // "heading",      // Uncomment to hide all headings (H1-H6)
  // "bulletListItem", // Uncomment to hide Bullet List
  // "numberedListItem", // Uncomment to hide Numbered List
]);

// Filter out unwanted block types from default specs
const filteredBlockSpecs = Object.fromEntries(
  Object.entries(defaultBlockSpecs).filter(
    ([key]) => !blockTypesToHide.has(key),
  ),
);

// Exclude specific styles from formatting toolbar
const stylesToHide = new Set([
  "strike",
  "underline",
  "textColor",
  "backgroundColor",
]);

const filteredStyleSpecs = Object.fromEntries(
  Object.entries(defaultStyleSpecs).filter(([key]) => !stylesToHide.has(key)),
);

export const blockNoteSchema = BlockNoteSchema.create({
  blockSpecs: {
    ...filteredBlockSpecs,
    callout: Callout(),
    "quiz-true-false": TrueFalseQuiz(),
    "quiz-open-ended": OpenEndedQuiz(),
    "quiz-multiple-choice": MultipleChoiceQuiz(),
  },
  styleSpecs: filteredStyleSpecs,
});

export type CustomBlockSchema = typeof blockNoteSchema.blockSchema;
export type CustomInlineContentSchema =
  typeof blockNoteSchema.inlineContentSchema;
export type CustomStyleSchema = typeof blockNoteSchema.styleSchema;

export type CustomPartialBlock = PartialBlock<
  CustomBlockSchema,
  CustomInlineContentSchema,
  CustomStyleSchema
>;

export type CustomBlock = Block<
  CustomBlockSchema,
  CustomInlineContentSchema,
  CustomStyleSchema
>;

export type CustomBlockNoteEditor = CoreBlockNoteEditor<
  CustomBlockSchema,
  CustomInlineContentSchema,
  CustomStyleSchema
>;
