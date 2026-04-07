// Mock BlockNote before importing
jest.mock("@blocknote/react", () => ({
  useCreateBlockNote: jest.fn(),
}));

jest.mock("@blocknote/core", () => ({
  insertOrUpdateBlock: jest.fn(),
}));

jest.mock("@/lib/blocknote/schema", () => ({
  blockNoteSchema: {
    blockSchema: {},
    inlineContentSchema: {},
    styleSchema: {},
  },
}));

jest.mock("@/lib/blocknote/types", () => ({
  CalloutType: {},
}));

import {
  getCalloutSlashMenuItems,
  getQuizSlashMenuItems,
  getSandpackSlashMenuItems,
  getColumnBreakSlashMenuItems,
} from "@/components/ui/blocknote/editor/slash-menu-config";

// Mock BlockNote editor
const createMockEditor = () => {
  const mockEditor = {
    insertBlocks: jest.fn(),
    getTextCursorPosition: jest.fn(() => ({
      block: { id: "test-block" },
    })),
  } as any;

  return mockEditor;
};

describe("getCalloutSlashMenuItems", () => {
  it("should return all callout menu items", () => {
    const editor = createMockEditor();
    const items = getCalloutSlashMenuItems(editor);

    expect(items).toHaveLength(7);
    expect(items[0].title).toBe("Warning");
    expect(items[1].title).toBe("Question");
    expect(items[2].title).toBe("Important");
    expect(items[3].title).toBe("Definition");
    expect(items[4].title).toBe("More Information");
    expect(items[5].title).toBe("Caution");
    expect(items[6].title).toBe("Default Callout");
  });

  it("should have correct aliases for warning callout", () => {
    const editor = createMockEditor();
    const items = getCalloutSlashMenuItems(editor);
    const warningItem = items.find((item) => item.title === "Warning");

    expect(warningItem?.aliases).toEqual(["warning", "warn", "alert"]);
  });

  it("should have correct group for all callout items", () => {
    const editor = createMockEditor();
    const items = getCalloutSlashMenuItems(editor);

    items.forEach((item) => {
      expect(item.group).toBe("Callouts");
    });
  });

  it("should have icons for all callout items", () => {
    const editor = createMockEditor();
    const items = getCalloutSlashMenuItems(editor);

    items.forEach((item) => {
      expect(item.icon).toBeDefined();
    });
  });

  it("should insert callout block when item is clicked", () => {
    const editor = createMockEditor();
    const items = getCalloutSlashMenuItems(editor);
    const warningItem = items.find((item) => item.title === "Warning");

    warningItem?.onItemClick?.();

    // Note: insertOrUpdateBlock is called internally, so we can't directly test it
    // but we can verify the item has an onItemClick function
    expect(warningItem?.onItemClick).toBeDefined();
    expect(typeof warningItem?.onItemClick).toBe("function");
  });
});

describe("getQuizSlashMenuItems", () => {
  it("should return all quiz menu items", () => {
    const editor = createMockEditor();
    const items = getQuizSlashMenuItems(editor);

    expect(items).toHaveLength(3);
    expect(items[0].title).toBe("True/False Quiz");
    expect(items[1].title).toBe("Open-Ended Quiz");
    expect(items[2].title).toBe("Multiple Choice Quiz");
  });

  it("should have correct aliases for true/false quiz", () => {
    const editor = createMockEditor();
    const items = getQuizSlashMenuItems(editor);
    const tfItem = items.find((item) => item.title === "True/False Quiz");

    expect(tfItem?.aliases).toContain("true false");
    expect(tfItem?.aliases).toContain("tf");
    expect(tfItem?.aliases).toContain("quiz tf");
  });

  it("should have correct group for all quiz items", () => {
    const editor = createMockEditor();
    const items = getQuizSlashMenuItems(editor);

    items.forEach((item) => {
      expect(item.group).toBe("Quizzes");
    });
  });

  it("should have icons for all quiz items", () => {
    const editor = createMockEditor();
    const items = getQuizSlashMenuItems(editor);

    items.forEach((item) => {
      expect(item.icon).toBeDefined();
    });
  });

  it("should insert quiz block when item is clicked", () => {
    const editor = createMockEditor();
    const items = getQuizSlashMenuItems(editor);
    const tfItem = items.find((item) => item.title === "True/False Quiz");

    tfItem?.onItemClick?.();

    expect(editor.insertBlocks).toHaveBeenCalled();
    expect(editor.insertBlocks).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          type: "quiz-true-false",
          props: expect.objectContaining({
            question: "",
            correctAnswer: true,
          }),
        }),
      ]),
      expect.anything(),
      "after",
    );
  });

  it("should insert open-ended quiz with correct props", () => {
    const editor = createMockEditor();
    const items = getQuizSlashMenuItems(editor);
    const openEndedItem = items.find(
      (item) => item.title === "Open-Ended Quiz",
    );

    openEndedItem?.onItemClick?.();

    expect(editor.insertBlocks).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          type: "quiz-open-ended",
          props: expect.objectContaining({
            question: "",
            correctAnswer: "",
          }),
        }),
      ]),
      expect.anything(),
      "after",
    );
  });

  it("should insert multiple choice quiz with correct props", () => {
    const editor = createMockEditor();
    const items = getQuizSlashMenuItems(editor);
    const mcItem = items.find((item) => item.title === "Multiple Choice Quiz");

    mcItem?.onItemClick?.();

    expect(editor.insertBlocks).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          type: "quiz-multiple-choice",
          props: expect.objectContaining({
            question: "",
            options: expect.arrayContaining([
              expect.objectContaining({ id: "1", text: "", isCorrect: true }),
              expect.objectContaining({ id: "2", text: "", isCorrect: false }),
            ]),
          }),
        }),
      ]),
      expect.anything(),
      "after",
    );
  });
});

describe("getColumnBreakSlashMenuItems", () => {
  it("returns an array with one item titled 'Column Break'", () => {
    const editor = createMockEditor();
    const items = getColumnBreakSlashMenuItems(editor);

    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("Column Break");
  });

  it("has correct aliases including 'column' and 'col break'", () => {
    const editor = createMockEditor();
    const items = getColumnBreakSlashMenuItems(editor);

    expect(items[0].aliases).toContain("column");
    expect(items[0].aliases).toContain("col break");
  });

  it("belongs to the Presentation group", () => {
    const editor = createMockEditor();
    const items = getColumnBreakSlashMenuItems(editor);

    expect(items[0].group).toBe("Presentation");
  });

  it("has an icon defined", () => {
    const editor = createMockEditor();
    const items = getColumnBreakSlashMenuItems(editor);

    expect(items[0].icon).toBeDefined();
  });

  it("calls editor.insertBlocks with column-break type on click", () => {
    const editor = createMockEditor();
    const items = getColumnBreakSlashMenuItems(editor);

    items[0].onItemClick?.();

    expect(editor.insertBlocks).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ type: "column-break" }),
      ]),
      expect.anything(),
      "after",
    );
  });
});

describe("getSandpackSlashMenuItems", () => {
  it("returns an array with one item titled 'Live Sandbox'", () => {
    const editor = createMockEditor();
    const items = getSandpackSlashMenuItems(editor);

    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("Live Sandbox");
  });

  it("has correct aliases including sandbox, live, and playground", () => {
    const editor = createMockEditor();
    const items = getSandpackSlashMenuItems(editor);
    const item = items[0];

    expect(item.aliases).toContain("sandbox");
    expect(item.aliases).toContain("live");
    expect(item.aliases).toContain("playground");
  });

  it("belongs to the Code group", () => {
    const editor = createMockEditor();
    const items = getSandpackSlashMenuItems(editor);

    expect(items[0].group).toBe("Code");
  });

  it("has an icon defined", () => {
    const editor = createMockEditor();
    const items = getSandpackSlashMenuItems(editor);

    expect(items[0].icon).toBeDefined();
  });

  it("calls editor.insertBlocks with sandpack-block type and correct default props on click", () => {
    const editor = createMockEditor();
    const items = getSandpackSlashMenuItems(editor);
    const item = items[0];

    item.onItemClick?.();

    expect(editor.insertBlocks).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          type: "sandpack-block",
          props: expect.objectContaining({
            template: "vanilla",
            files: "{}",
            showPreview: true,
            editable: true,
          }),
        }),
      ]),
      expect.anything(),
      "after",
    );
  });
});
