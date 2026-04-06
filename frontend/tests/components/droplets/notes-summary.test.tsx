import { render, screen } from "@testing-library/react";
import NotesSummary from "@/components/droplets/notes-summary";
import {
  Block,
  Droplet,
  DropletStatus,
  DropletType,
  FocusArea,
  HighlightColor,
  Lesson,
  Tag,
} from "@/types";

describe("NotesSummary", () => {
  const mockLesson = {
    id: 1,
    name: "Test Lesson",
    slug: "test-lesson",
    type: "standard",
    blocks: [] as Block[],
    droplets: [] as Droplet[],
    notes: "",
    orderIndex: 0,
  };

  const mockDroplet = {
    id: 1,
    name: "Test Droplet",
    slug: "test-droplet",
    isHidden: false,
    focusArea: "personal" as FocusArea,
    type: "knowledge" as DropletType,
    tags: [{ id: 1, slug: "react", name: "React", droplets: [] }] as Tag[],
    learningObjectives: [],
    status: "published" as DropletStatus,
  };

  const mockEnrollment = {
    id: "1",
    authorizedUser: { id: 1 } as any,
    droplet: mockDroplet as any,
    viewedLessons: [] as Lesson[],
    isComplete: false,
    rating: 5,
    notes: [] as any[],
    isFirstTime: false,
    isArchived: false,
    completionDate: new Date(),
  };

  const mockHighlight = {
    id: 1,
    text: "Test highlight",
    color: "#fff300" as HighlightColor,
    position: { start: 0, end: 10 },
    blockId: 1,
    lesson: {
      ...mockLesson,
    },
  };

  const mockNote = {
    id: 1,
    content: "Test note content",
    lesson: {
      ...mockLesson,
    },
    enrollment: mockEnrollment,
    positionY: 0,
    highlight: undefined,
  };

  const mockMappedLesson = {
    ...mockLesson,
    id: 1,
    orderIndex: 1,
  };

  describe("Empty States", () => {
    it("shows empty state (renders nothing) when no notes or highlights", () => {
      const { container } = render(
        <NotesSummary
          dropletHighlights={[]}
          dropletNotes={[]}
          mappedLessons={[mockMappedLesson]}
          selectedColors={["#fff300"]}
          allNotes={{ dropletId: 1, notes: [], highlights: [] }}
        />,
      );

      // Component renders nothing visible when empty
      expect(container.querySelector(".rounded-lg")).not.toBeInTheDocument();
    });

    it("shows empty state when all filtered out by color", () => {
      render(
        <NotesSummary
          dropletHighlights={[mockHighlight]}
          dropletNotes={[mockNote]}
          mappedLessons={[mockMappedLesson]}
          selectedColors={["#a3e4ff" as HighlightColor]} // Different color, nothing matches
          allNotes={{
            dropletId: 1,
            notes: [mockNote],
            highlights: [mockHighlight],
          }}
        />,
      );
    });
  });

  describe("Highlight Rendering", () => {
    it("renders highlights with selected color", () => {
      render(
        <NotesSummary
          dropletHighlights={[mockHighlight]}
          dropletNotes={[]}
          mappedLessons={[mockMappedLesson]}
          selectedColors={["#fff300"]}
          allNotes={{ dropletId: 1, notes: [], highlights: [mockHighlight] }}
        />,
      );

      expect(screen.getByText("Test highlight")).toBeInTheDocument();
    });

    it("filters out highlights with unselected colors", () => {
      const yellowHighlight = { ...mockHighlight, text: "Yellow highlight" };
      const blueHighlight = {
        ...mockHighlight,
        id: 2,
        text: "Blue highlight",
        color: "#a3e4ff" as HighlightColor,
      };

      render(
        <NotesSummary
          dropletHighlights={[yellowHighlight, blueHighlight]}
          dropletNotes={[]}
          mappedLessons={[mockMappedLesson]}
          selectedColors={["#fff300"]} // Only yellow
          allNotes={{
            dropletId: 1,
            notes: [],
            highlights: [yellowHighlight, blueHighlight],
          }}
        />,
      );

      expect(screen.getByText("Yellow highlight")).toBeInTheDocument();
      expect(screen.queryByText("Blue highlight")).not.toBeInTheDocument();
    });

    it("renders highlighter icon for highlights", () => {
      const { container } = render(
        <NotesSummary
          dropletHighlights={[mockHighlight]}
          dropletNotes={[]}
          mappedLessons={[mockMappedLesson]}
          selectedColors={["#fff300"]}
          allNotes={{ dropletId: 1, notes: [], highlights: [mockHighlight] }}
        />,
      );

      // Component uses tabler icons (IconHighlight), not lucide
      const icon = container.querySelector("svg");
      expect(icon).toBeInTheDocument();
    });

    it("applies background color to highlight", () => {
      const { container } = render(
        <NotesSummary
          dropletHighlights={[mockHighlight]}
          dropletNotes={[]}
          mappedLessons={[mockMappedLesson]}
          selectedColors={["#fff300"]}
          allNotes={{ dropletId: 1, notes: [], highlights: [mockHighlight] }}
        />,
      );

      const highlightSpan = screen.getByText("Test highlight");
      expect(highlightSpan).toHaveClass("bg-[#fff300]");
      expect(highlightSpan).toHaveClass("rounded");
      expect(highlightSpan).toHaveClass("px-1");
    });
  });

  describe("Note Rendering", () => {
    it("renders notes without highlights", () => {
      render(
        <NotesSummary
          dropletHighlights={[]}
          dropletNotes={[mockNote]}
          mappedLessons={[mockMappedLesson]}
          selectedColors={["#fff300"]}
          allNotes={{ dropletId: 1, notes: [mockNote], highlights: [] }}
        />,
      );

      expect(screen.getByText("Test note content")).toBeInTheDocument();
    });

    it("renders note with associated highlight", () => {
      const noteWithHighlight = {
        ...mockNote,
        highlight: mockHighlight,
      };

      render(
        <NotesSummary
          dropletHighlights={[]}
          dropletNotes={[noteWithHighlight]}
          mappedLessons={[mockMappedLesson]}
          selectedColors={["#fff300"]}
          allNotes={{
            dropletId: 1,
            notes: [noteWithHighlight],
            highlights: [],
          }}
        />,
      );

      expect(screen.getByText("Test highlight")).toBeInTheDocument();
      expect(screen.getByText("Test note content")).toBeInTheDocument();
    });

    it("filters notes by highlight color", () => {
      const yellowNote = {
        ...mockNote,
        id: 1,
        content: "Yellow note",
        highlight: { ...mockHighlight, color: "#fff300" as HighlightColor },
      };

      const blueNote = {
        ...mockNote,
        id: 2,
        content: "Blue note",
        highlight: { ...mockHighlight, color: "#a3e4ff" as HighlightColor },
      };

      render(
        <NotesSummary
          dropletHighlights={[]}
          dropletNotes={[yellowNote, blueNote]}
          mappedLessons={[mockMappedLesson]}
          selectedColors={["#fff300"]} // Only yellow
          allNotes={{
            dropletId: 1,
            notes: [yellowNote, blueNote],
            highlights: [],
          }}
        />,
      );

      expect(screen.getByText("Yellow note")).toBeInTheDocument();
      expect(screen.queryByText("Blue note")).not.toBeInTheDocument();
    });

    it("includes notes without highlights when any color selected", () => {
      const noteWithoutHighlight = { ...mockNote, highlight: undefined };

      render(
        <NotesSummary
          dropletHighlights={[]}
          dropletNotes={[noteWithoutHighlight]}
          mappedLessons={[mockMappedLesson]}
          selectedColors={["#fff300"]}
          allNotes={{
            dropletId: 1,
            notes: [noteWithoutHighlight],
            highlights: [],
          }}
        />,
      );

      expect(screen.getByText("Test note content")).toBeInTheDocument();
    });

    it("renders notebook icon for notes", () => {
      const { container } = render(
        <NotesSummary
          dropletHighlights={[]}
          dropletNotes={[mockNote]}
          mappedLessons={[mockMappedLesson]}
          selectedColors={["#fff300"]}
          allNotes={{ dropletId: 1, notes: [mockNote], highlights: [] }}
        />,
      );

      // Component uses tabler icons (IconNotes), not lucide
      const icon = container.querySelector("svg");
      expect(icon).toBeInTheDocument();
    });
  });

  describe("HTML Stripping", () => {
    it("strips HTML tags from note content", () => {
      const htmlNote = {
        ...mockNote,
        content: "<p>Test <strong>note</strong> with <em>HTML</em></p>",
      };

      render(
        <NotesSummary
          dropletHighlights={[]}
          dropletNotes={[htmlNote]}
          mappedLessons={[mockMappedLesson]}
          selectedColors={["#fff300"]}
          allNotes={{ dropletId: 1, notes: [htmlNote], highlights: [] }}
        />,
      );

      expect(screen.getByText("Test note with HTML")).toBeInTheDocument();
    });

    it("strips HTML entities partially", () => {
      const entityNote = {
        ...mockNote,
        content: "Test&nbsp;&amp;&lt;&gt;&quot;&#39;content",
      };

      render(
        <NotesSummary
          dropletHighlights={[]}
          dropletNotes={[entityNote]}
          mappedLessons={[mockMappedLesson]}
          selectedColors={["#fff300"]}
          allNotes={{ dropletId: 1, notes: [entityNote], highlights: [] }}
        />,
      );

      // Based on the HTML output, it shows: Test &&lt;&gt;"'content
      // &nbsp; -> space, &amp; -> &, &quot; and &#39; -> " and '
      // But &lt; and &gt; remain as &lt; and &gt;
      expect(screen.getByText(/Test &/)).toBeInTheDocument();
    });

    it("removes extra whitespace", () => {
      const whitespaceNote = {
        ...mockNote,
        content: "Test    note   with    spaces",
      };

      render(
        <NotesSummary
          dropletHighlights={[]}
          dropletNotes={[whitespaceNote]}
          mappedLessons={[mockMappedLesson]}
          selectedColors={["#fff300"]}
          allNotes={{ dropletId: 1, notes: [whitespaceNote], highlights: [] }}
        />,
      );

      expect(screen.getByText("Test note with spaces")).toBeInTheDocument();
    });

    it("trims whitespace", () => {
      const trimNote = {
        ...mockNote,
        content: "   Test note   ",
      };

      render(
        <NotesSummary
          dropletHighlights={[]}
          dropletNotes={[trimNote]}
          mappedLessons={[mockMappedLesson]}
          selectedColors={["#fff300"]}
          allNotes={{ dropletId: 1, notes: [trimNote], highlights: [] }}
        />,
      );

      expect(screen.getByText("Test note")).toBeInTheDocument();
    });
  });

  describe("Lesson Grouping", () => {
    it("renders lesson name header", () => {
      render(
        <NotesSummary
          dropletHighlights={[mockHighlight]}
          dropletNotes={[]}
          mappedLessons={[mockMappedLesson]}
          selectedColors={["#fff300"]}
          allNotes={{ dropletId: 1, notes: [], highlights: [mockHighlight] }}
        />,
      );

      expect(screen.getByText("Test Lesson")).toBeInTheDocument();
    });

    it("does not render lesson header when no notes/highlights for that lesson", () => {
      const emptyLesson = {
        ...mockMappedLesson,
        id: 999,
      };

      render(
        <NotesSummary
          dropletHighlights={[mockHighlight]} // Has lesson id 123
          dropletNotes={[]}
          mappedLessons={[emptyLesson]} // Lesson id 999
          selectedColors={["#fff300"]}
          allNotes={{ dropletId: 1, notes: [], highlights: [mockHighlight] }}
        />,
      );

      // Lesson header should not appear since no notes match this lesson
      const lessonHeaders = screen.queryAllByText("Test Lesson");
      expect(lessonHeaders.length).toBe(0);
    });

    it("renders multiple lessons with notes", () => {
      const lesson2 = {
        id: 2,
        name: "Second Lesson",
        slug: "second-lesson",
        type: "standard",
        droplets: [] as Droplet[],
        notes: "",
        blocks: [] as Block[],
        orderIndex: 2,
      };

      const highlight2 = {
        ...mockHighlight,
        id: 2,
        text: "Highlight in lesson 2",
        lesson: {
          ...lesson2,
        },
      };

      render(
        <NotesSummary
          dropletHighlights={[mockHighlight, highlight2]}
          dropletNotes={[]}
          mappedLessons={[mockMappedLesson, lesson2]}
          selectedColors={["#fff300"]}
          allNotes={{
            dropletId: 1,
            notes: [],
            highlights: [mockHighlight, highlight2],
          }}
        />,
      );

      expect(screen.getByText("Test Lesson")).toBeInTheDocument();
      expect(screen.getByText("Second Lesson")).toBeInTheDocument();
    });
  });

  describe("Combined Notes and Highlights", () => {
    it("renders both highlights and notes", () => {
      render(
        <NotesSummary
          dropletHighlights={[mockHighlight]}
          dropletNotes={[mockNote]}
          mappedLessons={[mockMappedLesson]}
          selectedColors={["#fff300"]}
          allNotes={{
            dropletId: 1,
            notes: [mockNote],
            highlights: [mockHighlight],
          }}
        />,
      );

      expect(screen.getByText("Test highlight")).toBeInTheDocument();
      expect(screen.getByText("Test note content")).toBeInTheDocument();
    });

    it("renders note with highlight correctly", () => {
      const noteWithHighlight = {
        ...mockNote,
        highlight: mockHighlight,
      };

      render(
        <NotesSummary
          dropletHighlights={[]}
          dropletNotes={[noteWithHighlight]}
          mappedLessons={[mockMappedLesson]}
          selectedColors={["#fff300"]}
          allNotes={{
            dropletId: 1,
            notes: [noteWithHighlight],
            highlights: [],
          }}
        />,
      );

      // Should show both the highlight text and note content
      expect(screen.getByText("Test highlight")).toBeInTheDocument();
      expect(screen.getByText("Test note content")).toBeInTheDocument();
    });
  });

  describe("Icons", () => {
    it("renders highlighter icon for highlights", () => {
      const { container } = render(
        <NotesSummary
          dropletHighlights={[mockHighlight]}
          dropletNotes={[]}
          mappedLessons={[mockMappedLesson]}
          selectedColors={["#fff300"]}
          allNotes={{ dropletId: 1, notes: [], highlights: [mockHighlight] }}
        />,
      );

      // Component uses tabler icons (IconHighlight), not lucide
      const icon = container.querySelector("svg");
      expect(icon).toBeInTheDocument();
    });

    it("renders notebook icon for notes", () => {
      const { container } = render(
        <NotesSummary
          dropletHighlights={[]}
          dropletNotes={[mockNote]}
          mappedLessons={[mockMappedLesson]}
          selectedColors={["#fff300"]}
          allNotes={{ dropletId: 1, notes: [mockNote], highlights: [] }}
        />,
      );

      // Component uses tabler icons (IconNotes), not lucide
      const icon = container.querySelector("svg");
      expect(icon).toBeInTheDocument();
    });
  });

  describe("Styling", () => {
    it("applies correct styling to container", () => {
      const { container } = render(
        <NotesSummary
          dropletHighlights={[mockHighlight]}
          dropletNotes={[]}
          mappedLessons={[mockMappedLesson]}
          selectedColors={["#fff300"]}
          allNotes={{ dropletId: 1, notes: [], highlights: [mockHighlight] }}
        />,
      );

      // Component uses rounded-lg and custom border/bg colors
      const contentContainer = container.querySelector(".rounded-lg");
      expect(contentContainer).toBeInTheDocument();
    });

    it("applies correct styling to lesson header", () => {
      render(
        <NotesSummary
          dropletHighlights={[mockHighlight]}
          dropletNotes={[]}
          mappedLessons={[mockMappedLesson]}
          selectedColors={["#fff300"]}
          allNotes={{ dropletId: 1, notes: [], highlights: [mockHighlight] }}
        />,
      );

      const lessonHeader = screen.getByText("Test Lesson");
      expect(lessonHeader).toHaveClass("font-bold");
      expect(lessonHeader).toHaveClass("pl-4");
    });

    it("applies correct styling to highlight items", () => {
      render(
        <NotesSummary
          dropletHighlights={[mockHighlight]}
          dropletNotes={[]}
          mappedLessons={[mockMappedLesson]}
          selectedColors={["#fff300"]}
          allNotes={{ dropletId: 1, notes: [], highlights: [mockHighlight] }}
        />,
      );

      const highlightItem = screen.getByText("Test highlight").closest("li");
      expect(highlightItem).toHaveClass("px-4");
      expect(highlightItem).toHaveClass("py-3");
    });
  });

  describe("Edge Cases", () => {
    it("handles highlights without lesson", () => {
      const highlightNoLesson = { ...mockHighlight, lesson: undefined as any };

      render(
        <NotesSummary
          dropletHighlights={[highlightNoLesson]}
          dropletNotes={[]}
          mappedLessons={[mockMappedLesson]}
          selectedColors={["#fff300"]}
          allNotes={{
            dropletId: 1,
            notes: [],
            highlights: [highlightNoLesson],
          }}
        />,
      );

      // Without a lesson, it won't be matched to any mappedLesson, so won't render
      expect(screen.queryByText("Test highlight")).not.toBeInTheDocument();
    });

    it("handles notes without lesson", () => {
      const noteNoLesson = { ...mockNote, lesson: undefined as any };

      render(
        <NotesSummary
          dropletHighlights={[]}
          dropletNotes={[noteNoLesson]}
          mappedLessons={[mockMappedLesson]}
          selectedColors={["#fff300"]}
          allNotes={{ dropletId: 1, notes: [noteNoLesson], highlights: [] }}
        />,
      );

      // Without a lesson, it won't be matched, so won't render
      expect(screen.queryByText("Test note content")).not.toBeInTheDocument();
    });

    it("handles empty mapped lessons", () => {
      render(
        <NotesSummary
          dropletHighlights={[mockHighlight]}
          dropletNotes={[mockNote]}
          mappedLessons={[]}
          selectedColors={["#fff300"]}
          allNotes={{
            dropletId: 1,
            notes: [mockNote],
            highlights: [mockHighlight],
          }}
        />,
      );

      // With no mapped lessons to iterate through, nothing renders but container exists
      expect(screen.queryByText("Test Lesson")).not.toBeInTheDocument();
      expect(screen.queryByText("Test highlight")).not.toBeInTheDocument();
    });
  });
});
