"use client";

import {
  Block,
  BlockNoteEditor as CoreBlockNoteEditor,
  BlockNoteSchema,
  PartialBlock,
  createStyleSpec,
  defaultBlockSpecs,
  defaultStyleSpecs,
} from "@blocknote/core";
import katex from "katex";
import { Callout } from "@/components/ui/blocknote/blocks/callout-block";
import { TrueFalseQuiz } from "@/components/ui/blocknote/blocks/quiz-true-false-block";
import { OpenEndedQuiz } from "@/components/ui/blocknote/blocks/quiz-open-ended-block";
import { MultipleChoiceQuiz } from "@/components/ui/blocknote/blocks/quiz-multiple-choice-block";
import { LatexBlock } from "@/components/ui/blocknote/blocks/latex-block";
import { ImageBlock } from "@/components/ui/blocknote/blocks/image-block";
import { CodeBlock } from "@/components/ui/blocknote/blocks/code-block"; // ADD THIS

const blockTypesToHide = new Set([
  "quote",
  "toggleListItem",
  "checklistItem",
  "image",
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

const latexStyleSpec = createStyleSpec(
  {
    type: "latex",
    propSchema: "boolean",
  },
  {
    render: () => {
      const wrapper = document.createElement("span");
      wrapper.classList.add("bn-inline-latex");

      const editable = document.createElement("span");
      editable.classList.add("bn-inline-latex-input");
      editable.setAttribute("data-editable", "true");

      const preview = document.createElement("span");
      preview.classList.add("bn-inline-latex-preview");
      preview.setAttribute("aria-hidden", "true");

      const renderPreview = () => {
        const latex = editable.textContent ?? "";
        if (!latex.trim()) {
          preview.innerHTML = "";
          wrapper.classList.remove("bn-inline-latex--error");
          return;
        }
        try {
          katex.render(latex, preview, {
            throwOnError: false,
            displayMode: false,
          });
          wrapper.classList.remove("bn-inline-latex--error");
        } catch (error) {
          preview.textContent = latex;
          wrapper.classList.add("bn-inline-latex--error");
        }
      };

      const observer = new MutationObserver(renderPreview);
      observer.observe(editable, {
        characterData: true,
        childList: true,
        subtree: true,
      });

      const handleInput = () => renderPreview();
      const handleFocus = () =>
        wrapper.classList.add("bn-inline-latex--editing");
      const handleBlur = () =>
        wrapper.classList.remove("bn-inline-latex--editing");
      const handlePreviewMouseDown = (event: MouseEvent) => {
        event.preventDefault();
        editable.focus();
      };

      editable.addEventListener("input", handleInput);
      editable.addEventListener("focus", handleFocus);
      editable.addEventListener("blur", handleBlur);
      preview.addEventListener("mousedown", handlePreviewMouseDown);

      renderPreview();

      wrapper.appendChild(editable);
      wrapper.appendChild(preview);

      return {
        dom: wrapper,
        contentDOM: editable,
        destroy: () => {
          observer.disconnect();
          editable.removeEventListener("input", handleInput);
          editable.removeEventListener("focus", handleFocus);
          editable.removeEventListener("blur", handleBlur);
          preview.removeEventListener("mousedown", handlePreviewMouseDown);
        },
      };
    },
  },
);

const customStyleSpecs = {
  ...filteredStyleSpecs,
  latex: latexStyleSpec,
};

export const blockNoteSchema = BlockNoteSchema.create({
  blockSpecs: {
    ...filteredBlockSpecs,
    callout: Callout(),
    "quiz-true-false": TrueFalseQuiz(),
    "quiz-open-ended": OpenEndedQuiz(),
    "quiz-multiple-choice": MultipleChoiceQuiz(),
    latex: LatexBlock(),
    image: ImageBlock(),
    "code-block": CodeBlock(),
  },
  styleSpecs: customStyleSpecs,
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
