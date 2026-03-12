import { parseMarkdownToBlockNote } from "@/lib/blocknote/markdown-to-blocknote";

describe("parseMarkdownToBlockNote", () => {
  describe("Title Extraction", () => {
    it("should extract the first H1 as the lesson title", () => {
      const markdown = "# My Lesson Title\n\nSome content";
      const result = parseMarkdownToBlockNote(markdown);
      expect(result.title).toBe("My Lesson Title");
    });

    it("should default to 'Untitled Lesson' if no H1 exists", () => {
      const markdown = "## Just a heading 2\n\nSome content";
      const result = parseMarkdownToBlockNote(markdown);
      expect(result.title).toBe("Untitled Lesson");
    });

    it("should still include first H1 in blocks", () => {
      const markdown = "# My Lesson Title";
      const result = parseMarkdownToBlockNote(markdown);
      expect(result.blocks).toHaveLength(1);
      expect(result.blocks[0].type).toBe("heading");
      expect(result.blocks[0].props.level).toBe(1);
    });
  });

  describe("Headings", () => {
    it("should parse H1 headings", () => {
      const markdown = "# Heading 1";
      const result = parseMarkdownToBlockNote(markdown);
      expect(result.blocks[0]).toMatchObject({
        type: "heading",
        props: { level: 1 },
        content: [{ text: "Heading 1", type: "text" }],
      });
    });

    it("should parse H2 headings", () => {
      const markdown = "## Heading 2";
      const result = parseMarkdownToBlockNote(markdown);
      expect(result.blocks[0]).toMatchObject({
        type: "heading",
        props: { level: 2 },
        content: [{ text: "Heading 2", type: "text" }],
      });
    });

    it("should parse H3 headings", () => {
      const markdown = "### Heading 3";
      const result = parseMarkdownToBlockNote(markdown);
      expect(result.blocks[0]).toMatchObject({
        type: "heading",
        props: { level: 3 },
        content: [{ text: "Heading 3", type: "text" }],
      });
    });

    it("should parse multiple headings in sequence", () => {
      const markdown = "# H1\n## H2\n### H3";
      const result = parseMarkdownToBlockNote(markdown);
      expect(result.blocks).toHaveLength(3);
      expect(result.blocks[0].props.level).toBe(1);
      expect(result.blocks[1].props.level).toBe(2);
      expect(result.blocks[2].props.level).toBe(3);
    });
  });

  describe("Paragraphs", () => {
    it("should parse regular paragraphs", () => {
      const markdown = "This is a paragraph.";
      const result = parseMarkdownToBlockNote(markdown);
      expect(result.blocks[0]).toMatchObject({
        type: "paragraph",
        content: [{ text: "This is a paragraph.", type: "text" }],
      });
    });

    it("should parse multiple paragraphs", () => {
      const markdown = "First paragraph.\n\nSecond paragraph.";
      const result = parseMarkdownToBlockNote(markdown);
      expect(result.blocks).toHaveLength(2);
      expect((result.blocks[0]?.content as any)?.[0]?.text).toBe(
        "First paragraph.",
      );
      expect((result.blocks[1]?.content as any)?.[0]?.text).toBe(
        "Second paragraph.",
      );
    });

    it("should skip empty lines between paragraphs", () => {
      const markdown = "First paragraph.\n\n\n\nSecond paragraph.";
      const result = parseMarkdownToBlockNote(markdown);
      expect(result.blocks).toHaveLength(2);
    });
  });

  describe("Lists", () => {
    it("should parse numbered lists", () => {
      const markdown = "1. First item\n2. Second item\n3. Third item";
      const result = parseMarkdownToBlockNote(markdown);
      expect(result.blocks).toHaveLength(3);
      expect(result.blocks[0]).toMatchObject({
        type: "numberedListItem",
        content: [{ text: "First item", type: "text" }],
      });
    });

    it("should parse bulleted lists with dash", () => {
      const markdown = "- First item\n- Second item\n- Third item";
      const result = parseMarkdownToBlockNote(markdown);
      expect(result.blocks).toHaveLength(3);
      expect(result.blocks[0]).toMatchObject({
        type: "bulletListItem",
        content: [{ text: "First item", type: "text" }],
      });
    });

    it("should parse bulleted lists with asterisk", () => {
      const markdown = "* First item\n* Second item";
      const result = parseMarkdownToBlockNote(markdown);
      expect(result.blocks).toHaveLength(2);
      expect(result.blocks[0].type).toBe("bulletListItem");
    });

    it("should handle list items with multiple words", () => {
      const markdown = "1. This is a longer list item with multiple words";
      const result = parseMarkdownToBlockNote(markdown);
      expect((result.blocks[0]?.content as any)?.[0]?.text).toBe(
        "This is a longer list item with multiple words",
      );
    });
  });

  describe("Callouts", () => {
    it("should parse warning callouts", () => {
      const markdown = "%warning This is a warning";
      const result = parseMarkdownToBlockNote(markdown);
      expect(result.blocks[0]).toMatchObject({
        type: "callout",
        props: { calloutType: "warning" },
        content: [{ text: "This is a warning", type: "text" }],
      });
    });

    it("should parse question callouts", () => {
      const markdown = "%question What is this?";
      const result = parseMarkdownToBlockNote(markdown);
      expect(result.blocks[0].props.calloutType).toBe("question");
    });

    it("should parse all callout types", () => {
      const calloutTypes = [
        "warning",
        "question",
        "important",
        "definition",
        "more-information",
        "caution",
        "default",
      ];

      calloutTypes.forEach((type) => {
        const markdown = `%${type} Test content`;
        const result = parseMarkdownToBlockNote(markdown);
        expect(result.blocks[0].props.calloutType).toBe(type);
      });
    });

    it("should ignore invalid callout types", () => {
      const markdown = "%invalid This should not be a callout";
      const result = parseMarkdownToBlockNote(markdown);
      // Should be treated as a paragraph or skipped
      expect(result.blocks[0]?.props?.calloutType).toBeUndefined();
    });

    it("should handle callout content with special characters", () => {
      const markdown = "%warning Be careful with $special & characters!";
      const result = parseMarkdownToBlockNote(markdown);
      expect((result.blocks[0]?.content as any)?.[0]?.text).toBe(
        "Be careful with $special & characters!",
      );
    });
  });

  describe("Quizzes - True/False", () => {
    it("should parse true/false quiz with true answer", () => {
      const markdown = "%%true-false\n- The sky is blue\n- true";
      const result = parseMarkdownToBlockNote(markdown);
      expect(result.blocks[0]).toMatchObject({
        type: "quiz-true-false",
        props: {
          question: "The sky is blue",
          correctAnswer: true,
        },
      });
    });

    it("should parse true/false quiz with false answer", () => {
      const markdown = "%%true-false\n- The sky is green\n- false";
      const result = parseMarkdownToBlockNote(markdown);
      expect(result.blocks[0].props.correctAnswer).toBe(false);
    });

    it("should handle case-insensitive true/false answers", () => {
      const markdown = "%%true-false\n- Question\n- TRUE";
      const result = parseMarkdownToBlockNote(markdown);
      expect(result.blocks[0].props.correctAnswer).toBe(true);
    });
  });

  describe("Quizzes - Open Ended", () => {
    it("should parse open-ended quiz", () => {
      const markdown =
        '%%open-ended\n- Simon Says, "Hello World"\n- Hello World';
      const result = parseMarkdownToBlockNote(markdown);
      expect(result.blocks[0]).toMatchObject({
        type: "quiz-open-ended",
        props: {
          question: 'Simon Says, "Hello World"',
          correctAnswer: "Hello World",
        },
      });
    });

    it("should handle empty correct answer", () => {
      const markdown = "%%open-ended\n- What is this?";
      const result = parseMarkdownToBlockNote(markdown);
      expect(result.blocks[0].props.correctAnswer).toBe("");
    });
  });

  describe("Quizzes - Multiple Choice", () => {
    it("should parse multiple choice quiz", () => {
      const markdown = "%%multiple-choice\n- What is 2+2?\n- 3\n- 4 <\n- 5";
      const result = parseMarkdownToBlockNote(markdown);
      expect(result.blocks[0]).toMatchObject({
        type: "quiz-multiple-choice",
        props: {
          question: "What is 2+2?",
        },
      });
      expect(result.blocks[0].props.options).toHaveLength(3);
    });

    it("should correctly mark the correct answer", () => {
      const markdown =
        "%%multiple-choice\n- Question\n- Option A\n- Option B <\n- Option C";
      const result = parseMarkdownToBlockNote(markdown);
      const options = result.blocks[0].props.options;
      expect(options[0].isCorrect).toBe(false);
      expect(options[1].isCorrect).toBe(true);
      expect(options[2].isCorrect).toBe(false);
    });

    it("should strip the < marker from correct answer text", () => {
      const markdown = "%%multiple-choice\n- Question\n- Correct Answer <";
      const result = parseMarkdownToBlockNote(markdown);
      expect(result.blocks[0].props.options[0].text).toBe("Correct Answer");
    });

    it("should handle multiple choice with 2-6 options", () => {
      const markdown =
        "%%multiple-choice\n- Question\n- A\n- B <\n- C\n- D\n- E\n- F";
      const result = parseMarkdownToBlockNote(markdown);
      expect(result.blocks[0].props.options).toHaveLength(6);
    });
  });

  describe("LaTeX", () => {
    it("should parse single-line LaTeX block", () => {
      const markdown = "$$x^2 + y^2 = r^2$$";
      const result = parseMarkdownToBlockNote(markdown);
      expect(result.blocks[0]).toMatchObject({
        type: "latex",
        props: {
          content: "x^2 + y^2 = r^2",
          displayMode: true,
        },
      });
    });

    it("should parse multi-line LaTeX block", () => {
      const markdown = "$$\n\\frac{a}{b}\n$$";
      const result = parseMarkdownToBlockNote(markdown);
      expect(result.blocks[0].props.content).toContain("\\frac{a}{b}");
    });

    it("should handle complex LaTeX expressions", () => {
      const markdown = "$$\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}$$";
      const result = parseMarkdownToBlockNote(markdown);
      expect(result.blocks[0].props.content).toBe(
        "\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}",
      );
    });
  });

  describe("Tables", () => {
    it("should parse a basic table", () => {
      const markdown = `| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |`;
      const result = parseMarkdownToBlockNote(markdown);
      expect(result.blocks[0]).toBeDefined();
      expect(result.blocks[0].type).toBe("table");

      // Type guard to handle the content type
      const content = result.blocks[0].content as any;
      if (
        content &&
        typeof content === "object" &&
        !Array.isArray(content) &&
        "rows" in content
      ) {
        expect(content.rows).toHaveLength(2);
      } else {
        fail("Table content should have rows property");
      }
    });

    it("should parse table headers correctly", () => {
      const markdown = `| Name | Age |
|------|-----|
| John | 25  |`;
      const result = parseMarkdownToBlockNote(markdown);

      const content = result.blocks[0].content as any;
      if (
        content &&
        typeof content === "object" &&
        !Array.isArray(content) &&
        "rows" in content
      ) {
        const firstRow = content.rows[0];
        expect(firstRow.cells[0].content[0].text).toBe("Name");
        expect(firstRow.cells[1].content[0].text).toBe("Age");
      } else {
        fail("Table content should have rows property");
      }
    });

    it("should parse table with multiple rows", () => {
      const markdown = `| Col 1 | Col 2 |
|-------|-------|
| A     | B     |
| C     | D     |
| E     | F     |`;
      const result = parseMarkdownToBlockNote(markdown);

      const content = result.blocks[0].content as any;
      if (
        content &&
        typeof content === "object" &&
        !Array.isArray(content) &&
        "rows" in content
      ) {
        expect(content.rows).toHaveLength(4); // Header + 3 data rows
      } else {
        fail("Table content should have rows property");
      }
    });

    it("should handle tables with varying cell content", () => {
      const markdown = `| Short | Very Long Content Here |
|-------|------------------------|
| X     | Y                      |`;
      const result = parseMarkdownToBlockNote(markdown);

      const content = result.blocks[0].content as any;
      if (
        content &&
        typeof content === "object" &&
        !Array.isArray(content) &&
        "rows" in content
      ) {
        expect(content.rows[0].cells[1].content[0].text).toBe(
          "Very Long Content Here",
        );
      } else {
        fail("Table content should have rows property");
      }
    });
  });

  describe("Complex Documents", () => {
    it("should parse a document with mixed content types", () => {
      const markdown = `# Title

## Introduction

This is a paragraph.

%warning Important note

1. First item
2. Second item

%%true-false
- Is this a test?
- true`;

      const result = parseMarkdownToBlockNote(markdown);
      expect(result.title).toBe("Title");
      expect(result.blocks).toHaveLength(7); // H1, H2, paragraph, callout, 2 list items, quiz
      expect(result.blocks[0].type).toBe("heading");
      expect(result.blocks[3].type).toBe("callout");
      expect(result.blocks[6].type).toBe("quiz-true-false");
    });

    it("should handle the full test markdown document", () => {
      const markdown = `# Introduction to React Hooks

## What Are Hooks?

React Hooks are functions.

%warning Always call hooks at the top level

%%true-false
- React Hooks can only be used in class components
- false

| Hook Name | Purpose |
|-----------|---------|
| useState  | Manage state |`;

      const result = parseMarkdownToBlockNote(markdown);
      expect(result.title).toBe("Introduction to React Hooks");
      expect(result.blocks.length).toBeGreaterThan(5);
      expect(result.blocks.some((b) => b.type === "callout")).toBe(true);
      expect(result.blocks.some((b) => b.type === "quiz-true-false")).toBe(
        true,
      );
      expect(result.blocks.some((b) => b.type === "table")).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty markdown", () => {
      const markdown = "";
      const result = parseMarkdownToBlockNote(markdown);
      expect(result.title).toBe("Untitled Lesson");
      expect(result.blocks).toHaveLength(0);
    });

    it("should handle markdown with only whitespace", () => {
      const markdown = "   \n\n   \n   ";
      const result = parseMarkdownToBlockNote(markdown);
      expect(result.blocks).toHaveLength(0);
    });

    it("should handle malformed quiz blocks gracefully", () => {
      const markdown = "%%true-false\n";
      const result = parseMarkdownToBlockNote(markdown);
      // Should not crash, might skip the block
      expect(result.blocks).toBeDefined();
    });

    it("should generate unique IDs for each block", () => {
      const markdown = "# H1\n# H1\n# H1";
      const result = parseMarkdownToBlockNote(markdown);
      const ids = result.blocks.map((b) => b.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe("Block Structure", () => {
    it("should include required fields in all blocks", () => {
      const markdown = "# Heading";
      const result = parseMarkdownToBlockNote(markdown);
      const block = result.blocks[0];

      expect(block).toHaveProperty("id");
      expect(block).toHaveProperty("type");
      expect(block).toHaveProperty("props");
      expect(block).toHaveProperty("children");
      expect(typeof block.id).toBe("string");
      expect(block.id.length).toBeGreaterThan(0);
    });

    it("should set proper default props", () => {
      const markdown = "Regular paragraph";
      const result = parseMarkdownToBlockNote(markdown);
      expect(result.blocks[0].props).toMatchObject({
        textColor: "default",
        textAlignment: "left",
        backgroundColor: "default",
      });
    });
  });
});
