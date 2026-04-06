// Mock code block and its dependencies FIRST (before any other mocks)
jest.mock("@/components/ui/blocknote/blocks/code-block", () => ({
  CodeBlock: jest.fn(() => ({ type: "code-block" })),
}));

jest.mock("@/components/ui/blocknote/blocks/slide-break-block", () => ({
  SlideBreak: jest.fn(() => ({ type: "slide-break" })),
}));

jest.mock("@/components/ui/blocknote/blocks/column-break-block", () => ({
  ColumnBreak: jest.fn(() => ({ type: "column-break" })),
}));

jest.mock("@uiw/react-codemirror", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("@uiw/codemirror-theme-github", () => ({
  githubLight: {},
  githubDark: {},
}));

// Mock BlockNote before importing schema
jest.mock("@blocknote/react", () => ({
  createReactBlockSpec: jest.fn((config, spec) => () => ({
    type: config.type,
    propSchema: config.propSchema,
    ...spec,
  })),
}));

jest.mock("@blocknote/core", () => ({
  BlockNoteSchema: {
    create: jest.fn((config) => ({
      blockSpecs: config.blockSpecs,
      styleSpecs: config.styleSpecs,
      blockSchema: {},
      inlineContentSchema: {},
      styleSchema: {},
    })),
  },
  defaultBlockSpecs: {
    paragraph: {},
    heading: {},
    bulletListItem: {},
    numberedListItem: {},
    quote: {},
    toggleListItem: {},
    checklistItem: {},
  },
  defaultStyleSpecs: {
    bold: {},
    italic: {},
    strike: {},
    underline: {},
    textColor: {},
    backgroundColor: {},
  },
  Block: jest.fn(),
  BlockNoteEditor: jest.fn(),
  PartialBlock: jest.fn(),
  createStyleSpec: jest.fn((config, spec) => ({
    type: config.type,
    propSchema: config.propSchema,
    ...spec,
  })),
}));

jest.mock("@/components/ui/blocknote/blocks/callout-block", () => ({
  Callout: jest.fn(() => ({ type: "callout" })),
}));

jest.mock("@/components/ui/blocknote/blocks/quiz-true-false-block", () => ({
  TrueFalseQuiz: jest.fn(() => ({ type: "quiz-true-false" })),
}));

jest.mock("@/components/ui/blocknote/blocks/quiz-open-ended-block", () => ({
  OpenEndedQuiz: jest.fn(() => ({ type: "quiz-open-ended" })),
}));

jest.mock(
  "@/components/ui/blocknote/blocks/quiz-multiple-choice-block",
  () => ({
    MultipleChoiceQuiz: jest.fn(() => ({ type: "quiz-multiple-choice" })),
  }),
);

// Mock Dialog component to avoid importing BlockNote's FloatingComposer
jest.mock("@/components/ui/dialog", () => ({
  Dialog: jest.fn(),
  DialogContent: jest.fn(),
  DialogTitle: jest.fn(),
  DialogHeader: jest.fn(),
  DialogFooter: jest.fn(),
}));

jest.mock("@/components/ui/blocknote/blocks/latex-block", () => ({
  LatexBlock: jest.fn(() => ({ type: "latex" })),
}));

jest.mock("@/components/ui/blocknote/blocks/image-block", () => ({
  ImageBlock: jest.fn(() => ({ type: "image" })),
}));

jest.mock("@/components/ui/blocknote/blocks/notebook-code-block", () => ({
  NotebookCodeBlock: jest.fn(() => ({ type: "notebook-code" })),
}));

import { blockNoteSchema } from "@/lib/blocknote/schema";

describe("blockNoteSchema", () => {
  it("should exclude quote block from block specs", () => {
    const blockSpecs = blockNoteSchema.blockSpecs;
    expect(blockSpecs).not.toHaveProperty("quote");
  });

  it("should exclude toggleListItem from block specs", () => {
    const blockSpecs = blockNoteSchema.blockSpecs;
    expect(blockSpecs).not.toHaveProperty("toggleListItem");
  });

  it("should exclude checklistItem from block specs", () => {
    const blockSpecs = blockNoteSchema.blockSpecs;
    expect(blockSpecs).not.toHaveProperty("checklistItem");
  });

  it("should include custom callout block", () => {
    const blockSpecs = blockNoteSchema.blockSpecs;
    expect(blockSpecs).toHaveProperty("callout");
  });

  it("should include custom quiz blocks", () => {
    const blockSpecs = blockNoteSchema.blockSpecs;
    expect(blockSpecs).toHaveProperty("quiz-true-false");
    expect(blockSpecs).toHaveProperty("quiz-open-ended");
    expect(blockSpecs).toHaveProperty("quiz-multiple-choice");
  });

  it("should include custom latex block", () => {
    const blockSpecs = blockNoteSchema.blockSpecs;
    expect(blockSpecs).toHaveProperty("latex");
  });

  it("should include custom code-block", () => {
    const blockSpecs = blockNoteSchema.blockSpecs;
    expect(blockSpecs).toHaveProperty("code-block");
  });

  it("should include custom notebook-code block", () => {
    const blockSpecs = blockNoteSchema.blockSpecs;
    expect(blockSpecs).toHaveProperty("notebook-code");
  });

  it("should include default blocks that are not filtered", () => {
    const blockSpecs = blockNoteSchema.blockSpecs;
    expect(blockSpecs).toHaveProperty("paragraph");
    expect(blockSpecs).toHaveProperty("heading");
    expect(blockSpecs).toHaveProperty("bulletListItem");
    expect(blockSpecs).toHaveProperty("numberedListItem");
  });

  it("should exclude strike style from style specs", () => {
    const styleSpecs = blockNoteSchema.styleSpecs;
    expect(styleSpecs).not.toHaveProperty("strike");
  });

  it("should exclude underline style from style specs", () => {
    const styleSpecs = blockNoteSchema.styleSpecs;
    expect(styleSpecs).not.toHaveProperty("underline");
  });

  it("should exclude textColor style from style specs", () => {
    const styleSpecs = blockNoteSchema.styleSpecs;
    expect(styleSpecs).not.toHaveProperty("textColor");
  });

  it("should exclude backgroundColor style from style specs", () => {
    const styleSpecs = blockNoteSchema.styleSpecs;
    expect(styleSpecs).not.toHaveProperty("backgroundColor");
  });

  it("should include default styles that are not filtered", () => {
    const styleSpecs = blockNoteSchema.styleSpecs;
    expect(styleSpecs).toHaveProperty("bold");
    expect(styleSpecs).toHaveProperty("italic");
  });

  it("should have correct schema structure", () => {
    expect(blockNoteSchema).toHaveProperty("blockSchema");
    expect(blockNoteSchema).toHaveProperty("inlineContentSchema");
    expect(blockNoteSchema).toHaveProperty("styleSchema");
  });
});
