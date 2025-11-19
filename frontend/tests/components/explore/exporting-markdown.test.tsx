import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DropletTile } from "@/components/droplets/droplet-tile";
import { Droplet } from "@/types";

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = jest.fn(() => "blob:mock-url");
global.URL.revokeObjectURL = jest.fn();

// Mock Blob constructor
global.Blob = jest.fn((content, options) => ({
  content,
  options,
})) as any;

// Mock document methods
const mockClick = jest.fn();
const mockAppendChild = jest.fn();
const mockRemoveChild = jest.fn();

// Helper function to extract markdown content from Blob spy
const getMarkdownContent = (blobSpy: jest.SpyInstance): string => {
  const blobCall = blobSpy.mock.calls[0];
  if (!blobCall || !blobCall[0] || !blobCall[0][0]) {
    throw new Error("Blob was not called with expected arguments");
  }
  return blobCall[0][0] as string;
};

describe("Export Droplet to Markdown", () => {
  const mockDroplet: Droplet = {
    id: 1,
    slug: "test-droplet",
    name: "Test Droplet",
    description: "A test description",
    overview: "A test overview",
    type: "skill",
    focusArea: "technical",
    tags: [
      { id: 1, slug: "javascript", name: "JavaScript", droplets: [] },
      { id: 2, slug: "react", name: "React", droplets: [] },
    ],
    learningObjectives: [
      { id: 1, objective: "Learn JavaScript basics" },
      { id: 2, objective: "Understand React components" },
    ],
    authorized_users: [
      {
        id: 1,
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
      } as any,
      {
        id: 2,
        firstName: "Jane",
        lastName: "Smith",
        email: "jane@example.com",
      } as any,
    ],
    nextSteps: [
      {
        id: 1,
        label: "Advanced JavaScript",
        url: "https://example.com/advanced-js",
      },
      { id: 2, label: "React Hooks", url: "https://example.com/react-hooks" },
    ],
    prerequisites: [
      { id: 2, slug: "prereq-1", name: "HTML Basics" } as any,
      { id: 3, slug: "prereq-2", name: "CSS Fundamentals" } as any,
    ],
    postrequisites: [
      { id: 4, slug: "postreq-1", name: "Advanced Patterns" } as any,
    ],
    lessons: [
      {
        id: 1,
        name: "Introduction",
        slug: "introduction",
        orderIndex: 1,
        droplets: [],
        notes: [],
        blocks: [
          {
            __component: "droplets.generic" as const,
            content: "This is generic content",
          },
          {
            __component: "droplets.video" as const,
            url: "https://example.com/video.mp4",
          },
        ],
      },
      {
        id: 2,
        name: "Advanced Topics",
        slug: "advanced",
        orderIndex: 2,
        droplets: [],
        notes: [],
        blocks: [
          {
            __component: "droplets.expandable" as const,
            title: "More Details",
            content: "Expandable content here",
          },
          {
            __component: "droplets.callout" as const,
            content: [
              {
                type: "paragraph",
                children: [{ type: "text", text: "Important callout message" }],
              },
            ],
            color: "blue",
            type: "info",
          },
          {
            __component: "droplets.quiz" as const,
            questions: [
              {
                id: 1,
                content: "What is React?",
                answerOptions: [
                  { id: 1, content: "A library", isCorrect: true },
                  { id: 2, content: "A framework", isCorrect: false },
                ],
              },
            ],
          },
          {
            __component: "droplets.open-ended-quiz" as const,
            questions: [
              {
                id: 1,
                content: "Explain useState",
                correctAnswer: "A hook for state management",
              },
            ],
          },
        ],
      },
    ],
    isHidden: false,
    status: "published",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Button Visibility", () => {
    it("shows export button when user is admin", () => {
      render(<DropletTile droplet={mockDroplet} isAdmin={true} />);

      const exportButton = screen.getByRole("button", {
        name: /export markdown/i,
      });
      expect(exportButton).toBeVisible();
    });

    it("export button has tooltip", async () => {
      render(<DropletTile droplet={mockDroplet} isAdmin={true} />);

      const exportButton = screen.getByRole("button", {
        name: /export markdown/i,
      });

      fireEvent.mouseEnter(exportButton);

      await waitFor(() => {
        expect(screen.getByText("Export Markdown")).toBeInTheDocument();
      });
    });
  });

  describe("Export Functionality", () => {
    it("creates blob with correct markdown content", () => {
      const blobSpy = jest.spyOn(global, "Blob");

      render(<DropletTile droplet={mockDroplet} isAdmin={true} />);

      const exportButton = screen.getByRole("button", {
        name: /export markdown/i,
      });
      fireEvent.click(exportButton);

      expect(blobSpy).toHaveBeenCalledWith(
        [expect.stringContaining("# Test Droplet")],
        { type: "text/markdown" },
      );
    });

    it("creates and revokes object URL", () => {
      render(<DropletTile droplet={mockDroplet} isAdmin={true} />);

      const exportButton = screen.getByRole("button", {
        name: /export markdown/i,
      });
      fireEvent.click(exportButton);

      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
    });

    it("prevents event propagation when clicking export", () => {
      const mockOnClick = jest.fn();

      render(
        <div onClick={mockOnClick}>
          <DropletTile droplet={mockDroplet} isAdmin={true} />
        </div>,
      );

      const exportButton = screen.getByRole("button", {
        name: /export markdown/i,
      });
      fireEvent.click(exportButton);

      expect(mockOnClick).not.toHaveBeenCalled();
    });
  });

  describe("Markdown Content Structure", () => {
    it("includes droplet name as h1", () => {
      const blobSpy = jest.spyOn(global, "Blob");
      render(<DropletTile droplet={mockDroplet} isAdmin={true} />);
      const exportButton = screen.getByRole("button", {
        name: /export markdown/i,
      });
      fireEvent.click(exportButton);
      const markdownContent = getMarkdownContent(blobSpy);

      expect(markdownContent).toContain("# Test Droplet");
    });

    it("includes type and focus area", () => {
      const blobSpy = jest.spyOn(global, "Blob");
      render(<DropletTile droplet={mockDroplet} isAdmin={true} />);
      const exportButton = screen.getByRole("button", {
        name: /export markdown/i,
      });
      fireEvent.click(exportButton);
      const markdownContent = getMarkdownContent(blobSpy);

      expect(markdownContent).toContain("Type: skill");
      expect(markdownContent).toContain("Focus Area: technical"); // WITH SPACE!
    });

    it("includes all tags", () => {
      const blobSpy = jest.spyOn(global, "Blob");
      render(<DropletTile droplet={mockDroplet} isAdmin={true} />);
      const exportButton = screen.getByRole("button", {
        name: /export markdown/i,
      });
      fireEvent.click(exportButton);
      const markdownContent = getMarkdownContent(blobSpy);

      expect(markdownContent).toContain("## Tags");
      expect(markdownContent).toContain("* JavaScript");
      expect(markdownContent).toContain("* React");
    });

    it("includes all authors", () => {
      const blobSpy = jest.spyOn(global, "Blob");
      render(<DropletTile droplet={mockDroplet} isAdmin={true} />);
      const exportButton = screen.getByRole("button", {
        name: /export markdown/i,
      });
      fireEvent.click(exportButton);
      const markdownContent = getMarkdownContent(blobSpy);

      expect(markdownContent).toContain("## Authors");
      expect(markdownContent).toContain("* John Doe");
      expect(markdownContent).toContain("* Jane Smith");
    });

    it("includes description", () => {
      const blobSpy = jest.spyOn(global, "Blob");
      render(<DropletTile droplet={mockDroplet} isAdmin={true} />);
      const exportButton = screen.getByRole("button", {
        name: /export markdown/i,
      });
      fireEvent.click(exportButton);
      const markdownContent = getMarkdownContent(blobSpy);

      expect(markdownContent).toContain("## Description");
      expect(markdownContent).toContain("A test description");
    });

    it("includes overview", () => {
      const blobSpy = jest.spyOn(global, "Blob");
      render(<DropletTile droplet={mockDroplet} isAdmin={true} />);
      const exportButton = screen.getByRole("button", {
        name: /export markdown/i,
      });
      fireEvent.click(exportButton);
      const markdownContent = getMarkdownContent(blobSpy);

      expect(markdownContent).toContain("## Overview");
      expect(markdownContent).toContain("A test overview");
    });

    it("includes all learning objectives", () => {
      const blobSpy = jest.spyOn(global, "Blob");
      render(<DropletTile droplet={mockDroplet} isAdmin={true} />);
      const exportButton = screen.getByRole("button", {
        name: /export markdown/i,
      });
      fireEvent.click(exportButton);
      const markdownContent = getMarkdownContent(blobSpy);

      expect(markdownContent).toContain("## Learning Objectives");
      expect(markdownContent).toContain("* Learn JavaScript basics");
      expect(markdownContent).toContain("* Understand React components");
    });

    it("includes next steps with links", () => {
      const blobSpy = jest.spyOn(global, "Blob");
      render(<DropletTile droplet={mockDroplet} isAdmin={true} />);
      const exportButton = screen.getByRole("button", {
        name: /export markdown/i,
      });
      fireEvent.click(exportButton);
      const markdownContent = getMarkdownContent(blobSpy);

      expect(markdownContent).toContain("### Next Steps");
      expect(markdownContent).toContain(
        "* Advanced JavaScript linked to: https://example.com/advanced-js",
      );
      expect(markdownContent).toContain(
        "* React Hooks linked to: https://example.com/react-hooks",
      );
    });

    it("includes prerequisites", () => {
      const blobSpy = jest.spyOn(global, "Blob");
      render(<DropletTile droplet={mockDroplet} isAdmin={true} />);
      const exportButton = screen.getByRole("button", {
        name: /export markdown/i,
      });
      fireEvent.click(exportButton);
      const markdownContent = getMarkdownContent(blobSpy);

      expect(markdownContent).toContain("## Prerequisites");
      expect(markdownContent).toContain("* HTML Basics");
      expect(markdownContent).toContain("* CSS Fundamentals");
    });

    it("includes postrequisites", () => {
      const blobSpy = jest.spyOn(global, "Blob");
      render(<DropletTile droplet={mockDroplet} isAdmin={true} />);
      const exportButton = screen.getByRole("button", {
        name: /export markdown/i,
      });
      fireEvent.click(exportButton);
      const markdownContent = getMarkdownContent(blobSpy);

      expect(markdownContent).toContain("## Postrequisites");
      expect(markdownContent).toContain("* Advanced Patterns");
    });

    it("includes lessons section", () => {
      const blobSpy = jest.spyOn(global, "Blob");
      render(<DropletTile droplet={mockDroplet} isAdmin={true} />);
      const exportButton = screen.getByRole("button", {
        name: /export markdown/i,
      });
      fireEvent.click(exportButton);
      const markdownContent = getMarkdownContent(blobSpy);

      expect(markdownContent).toContain("## **Lessons**");
    });

    it("includes lesson names as h3", () => {
      const blobSpy = jest.spyOn(global, "Blob");
      render(<DropletTile droplet={mockDroplet} isAdmin={true} />);
      const exportButton = screen.getByRole("button", {
        name: /export markdown/i,
      });
      fireEvent.click(exportButton);
      const markdownContent = getMarkdownContent(blobSpy);

      expect(markdownContent).toContain("### Introduction");
      expect(markdownContent).toContain("### Advanced Topics");
    });
  });

  describe("Block Content Formatting", () => {
    let markdownContent: string;

    beforeEach(() => {
      const blobSpy = jest.spyOn(global, "Blob");

      render(<DropletTile droplet={mockDroplet} isAdmin={true} />);

      const exportButton = screen.getByRole("button", {
        name: /export markdown/i,
      });
      fireEvent.click(exportButton);

      markdownContent = getMarkdownContent(blobSpy);
    });

    it("formats generic blocks correctly", () => {
      expect(markdownContent).toContain("#### Generic Droplet");
      expect(markdownContent).toContain("This is generic content");
    });

    it("formats video blocks correctly", () => {
      expect(markdownContent).toContain("#### Video");
      expect(markdownContent).toContain(
        "Video Link: https://example.com/video.mp4",
      );
    });

    it("formats expandable blocks correctly", () => {
      expect(markdownContent).toContain("#### Expandable Droplet");
      expect(markdownContent).toContain("##### More Details");
      expect(markdownContent).toContain("Expandable content here");
    });

    it("formats callout blocks correctly", () => {
      expect(markdownContent).toContain("#### Callout Droplet");
      expect(markdownContent).toContain("Color: blue");
      expect(markdownContent).toContain("Type: info");
      expect(markdownContent).toContain("Important callout message");
    });

    it("formats quiz blocks correctly", () => {
      expect(markdownContent).toContain("#### Quiz");
      expect(markdownContent).toContain("1. What is React?");
      expect(markdownContent).toContain("1. Answer: A library is correct");
      expect(markdownContent).toContain("2. Answer: A framework is incorrect");
    });

    it("formats open-ended quiz blocks correctly", () => {
      expect(markdownContent).toContain("#### Open-Ended Quiz");
      expect(markdownContent).toContain("1. Explain useState");
      expect(markdownContent).toContain(
        "* Answer: A hook for state management",
      );
    });
  });

  describe("Edge Cases", () => {
    it("handles droplet with no tags", () => {
      const dropletNoTags = { ...mockDroplet, tags: undefined };
      const blobSpy = jest.spyOn(global, "Blob");

      render(<DropletTile droplet={dropletNoTags} isAdmin={true} />);

      const exportButton = screen.getByRole("button", {
        name: /export markdown/i,
      });
      fireEvent.click(exportButton);

      const markdownContent = getMarkdownContent(blobSpy);
      expect(markdownContent).toContain("No tags");
    });

    it("handles droplet with no authors", () => {
      const dropletNoAuthors = { ...mockDroplet, authorized_users: undefined };
      const blobSpy = jest.spyOn(global, "Blob");

      render(<DropletTile droplet={dropletNoAuthors} isAdmin={true} />);

      const exportButton = screen.getByRole("button", {
        name: /export markdown/i,
      });
      fireEvent.click(exportButton);

      const markdownContent = getMarkdownContent(blobSpy);
      expect(markdownContent).toContain("No authors");
    });

    it("handles droplet with no lessons", () => {
      const dropletNoLessons = { ...mockDroplet, lessons: undefined };
      const blobSpy = jest.spyOn(global, "Blob");

      render(<DropletTile droplet={dropletNoLessons} isAdmin={true} />);

      const exportButton = screen.getByRole("button", {
        name: /export markdown/i,
      });
      fireEvent.click(exportButton);

      const markdownContent = getMarkdownContent(blobSpy);
      expect(markdownContent).toContain("No lessons");
    });

    it("handles droplet with empty learning objectives", () => {
      const dropletNoObjectives = { ...mockDroplet, learningObjectives: [] };
      const blobSpy = jest.spyOn(global, "Blob");

      render(<DropletTile droplet={dropletNoObjectives} isAdmin={true} />);
      const exportButton = screen.getByRole("button", {
        name: /export markdown/i,
      });
      fireEvent.click(exportButton);

      const markdownContent = getMarkdownContent(blobSpy);
      expect(markdownContent).toContain("No objectives");
    });

    it("handles droplet with no prerequisites", () => {
      const dropletNoPrereqs = { ...mockDroplet, prerequisites: undefined };
      const blobSpy = jest.spyOn(global, "Blob");

      render(<DropletTile droplet={dropletNoPrereqs} isAdmin={true} />);
      const exportButton = screen.getByRole("button", {
        name: /export markdown/i,
      });
      fireEvent.click(exportButton);

      const markdownContent = getMarkdownContent(blobSpy);
      expect(markdownContent).toContain("No prereqs");
    });

    it("handles droplet with no postrequisites", () => {
      const dropletNoPostreqs = { ...mockDroplet, postrequisites: undefined };
      const blobSpy = jest.spyOn(global, "Blob");

      render(<DropletTile droplet={dropletNoPostreqs} isAdmin={true} />);
      const exportButton = screen.getByRole("button", {
        name: /export markdown/i,
      });
      fireEvent.click(exportButton);

      const markdownContent = getMarkdownContent(blobSpy);
      expect(markdownContent).toContain("No postreqs");
    });

    it("handles droplet with no next steps", () => {
      const dropletNoNextSteps = { ...mockDroplet, nextSteps: undefined };
      const blobSpy = jest.spyOn(global, "Blob");

      render(<DropletTile droplet={dropletNoNextSteps} isAdmin={true} />);

      const exportButton = screen.getByRole("button", {
        name: /export markdown/i,
      });
      fireEvent.click(exportButton);

      const markdownContent = getMarkdownContent(blobSpy);
      expect(markdownContent).toContain("No next steps");
    });

    it("handles lesson with no blocks", () => {
      const dropletEmptyBlocks = {
        ...mockDroplet,
        lessons: [
          {
            id: 1,
            name: "Empty Lesson",
            slug: "empty",
            orderIndex: 1,
            droplets: [],
            notes: [],
            blocks: [],
          },
        ],
      };
      const blobSpy = jest.spyOn(global, "Blob");

      render(<DropletTile droplet={dropletEmptyBlocks} isAdmin={true} />);

      const exportButton = screen.getByRole("button", {
        name: /export markdown/i,
      });
      fireEvent.click(exportButton);

      const markdownContent = getMarkdownContent(blobSpy);
      expect(markdownContent).toContain("### Empty Lesson");
    });

    it("handles droplet with special characters in name", () => {
      const dropletSpecialName = {
        ...mockDroplet,
        name: 'Test & <Special> "Characters"',
      };
      const blobSpy = jest.spyOn(global, "Blob");

      render(<DropletTile droplet={dropletSpecialName} isAdmin={true} />);

      const exportButton = screen.getByRole("button", {
        name: /export markdown/i,
      });
      fireEvent.click(exportButton);

      const markdownContent = getMarkdownContent(blobSpy);
      expect(markdownContent).toContain('# Test & <Special> "Characters"');
    });

    it("handles very long droplet content", () => {
      const longDroplet = {
        ...mockDroplet,
        description: "A".repeat(10000),
      };
      const blobSpy = jest.spyOn(global, "Blob");

      render(<DropletTile droplet={longDroplet} isAdmin={true} />);

      const exportButton = screen.getByRole("button", {
        name: /export markdown/i,
      });
      fireEvent.click(exportButton);

      expect(blobSpy).toHaveBeenCalled();
      const markdownContent = getMarkdownContent(blobSpy);
      expect(markdownContent.length).toBeGreaterThan(10000);
    });
  });

  describe("Multiple Quiz Questions", () => {
    it("handles quiz with multiple questions", () => {
      const dropletMultiQuiz = {
        ...mockDroplet,
        lessons: [
          {
            id: 1,
            name: "Quiz Lesson",
            slug: "quiz",
            orderIndex: 1,
            droplets: [],
            notes: [],
            blocks: [
              {
                __component: "droplets.quiz" as const,
                questions: [
                  {
                    id: 1,
                    content: "Question 1",
                    answerOptions: [
                      { id: 1, content: "Answer A", isCorrect: true },
                      { id: 2, content: "Answer B", isCorrect: false },
                    ],
                  },
                  {
                    id: 2,
                    content: "Question 2",
                    answerOptions: [
                      { id: 3, content: "Answer C", isCorrect: false },
                      { id: 4, content: "Answer D", isCorrect: true },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };
      const blobSpy = jest.spyOn(global, "Blob");

      render(<DropletTile droplet={dropletMultiQuiz} isAdmin={true} />);

      const exportButton = screen.getByRole("button", {
        name: /export markdown/i,
      });
      fireEvent.click(exportButton);

      const markdownContent = getMarkdownContent(blobSpy);
      expect(markdownContent).toContain("1. Question 1");
      expect(markdownContent).toContain("2. Question 2");
      expect(markdownContent).toContain("Answer A is correct");
      expect(markdownContent).toContain("Answer D is correct");
    });

    it("handles open-ended quiz with multiple questions", () => {
      const dropletMultiOpenQuiz = {
        ...mockDroplet,
        lessons: [
          {
            id: 1,
            name: "Open Quiz",
            slug: "open-quiz",
            orderIndex: 1,
            droplets: [],
            notes: [],
            blocks: [
              {
                __component: "droplets.open-ended-quiz" as const,
                questions: [
                  {
                    id: 1,
                    content: "Explain concept A",
                    correctAnswer: "Answer for A",
                  },
                  {
                    id: 2,
                    content: "Explain concept B",
                    correctAnswer: "Answer for B",
                  },
                ],
              },
            ],
          },
        ],
      };
      const blobSpy = jest.spyOn(global, "Blob");

      render(<DropletTile droplet={dropletMultiOpenQuiz} isAdmin={true} />);

      const exportButton = screen.getByRole("button", {
        name: /export markdown/i,
      });
      fireEvent.click(exportButton);

      const markdownContent = getMarkdownContent(blobSpy);
      expect(markdownContent).toContain("1. Explain concept A");
      expect(markdownContent).toContain("* Answer: Answer for A");
      expect(markdownContent).toContain("2. Explain concept B");
      expect(markdownContent).toContain("* Answer: Answer for B");
    });
  });

  describe("Callout Content Variations", () => {
    it("handles callout with multiple paragraphs", () => {
      const dropletMultiParagraph = {
        ...mockDroplet,
        lessons: [
          {
            id: 1,
            name: "Callout Lesson",
            slug: "callout",
            orderIndex: 1,
            droplets: [],
            notes: [],
            blocks: [
              {
                __component: "droplets.callout" as const,
                content: [
                  {
                    type: "paragraph",
                    children: [{ type: "text", text: "First paragraph" }],
                  },
                  {
                    type: "paragraph",
                    children: [{ type: "text", text: "Second paragraph" }],
                  },
                ],
                color: "red",
                type: "warning",
              },
            ],
          },
        ],
      };
      const blobSpy = jest.spyOn(global, "Blob");

      render(<DropletTile droplet={dropletMultiParagraph} isAdmin={true} />);

      const exportButton = screen.getByRole("button", {
        name: /export markdown/i,
      });
      fireEvent.click(exportButton);

      const markdownContent = getMarkdownContent(blobSpy);
      expect(markdownContent).toContain("First paragraph");
      expect(markdownContent).toContain("Second paragraph");
    });

    it("handles callout with empty content", () => {
      const dropletEmptyCallout = {
        ...mockDroplet,
        lessons: [
          {
            id: 1,
            name: "Empty Callout",
            slug: "empty-callout",
            orderIndex: 1,
            droplets: [],
            notes: [],
            blocks: [
              {
                __component: "droplets.callout" as const,
                content: [],
                color: "blue",
                type: "info",
              },
            ],
          },
        ],
      };
      const blobSpy = jest.spyOn(global, "Blob");

      render(<DropletTile droplet={dropletEmptyCallout} isAdmin={true} />);

      const exportButton = screen.getByRole("button", {
        name: /export markdown/i,
      });
      fireEvent.click(exportButton);

      const markdownContent = getMarkdownContent(blobSpy);
      expect(markdownContent).toContain("#### Callout Droplet");
      expect(markdownContent).toContain("Color: blue");
    });
  });
});
