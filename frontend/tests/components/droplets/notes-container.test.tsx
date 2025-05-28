import { NotesContainer } from "@/components/droplets/notes-container";
import {
  DropletStatus,
  DropletType,
  FocusArea,
  HighlightColor,
  Tag,
} from "@/types";
import { render, screen, fireEvent } from "@testing-library/react";

describe("NotesContainer", () => {
  const mockDroplet = {
    id: 1,
    name: "Test Droplet",
    slug: "test-droplet",
    isHidden: false,
    focusArea: "personal" as FocusArea,
    type: "knowledge" as DropletType,
    tags: [{ id: 1, name: "React" }] as Tag[],
    learningObjectives: [],
    status: "published" as DropletStatus,
    droplet_lessons: [],
  };
  const mockNote = {
    id: 1,
    content: "Test note content",
    lesson: {
      id: 1,
      name: "Test Lesson",
      slug: "test-lesson",
      blocks: [],
      droplets: [],
      droplet_lessons: [],
      notes: [],
    },
    enrollment: {
      id: "1",
      authorizedUser: { id: 1 },
      droplet: mockDroplet,
      viewedLessons: [],
      isComplete: false,
      rating: 5,
      notes: [],
      isFirstTime: false,
      isArchived: false,
    },
    positionY: 0,
    highlight: {
      text: "Highlighted text",
      color: "#fff300" as HighlightColor,
      position: { start: 0, end: 0 },
      blockId: 1,
    },
  };
  const mockProps = {
    dropletHighlights: [
      {
        id: 1,
        text: "Test highlight",
        color: "#fff300" as HighlightColor,
        position: { start: 0, end: 0 },
        blockId: 1,
        lesson: {
          id: 1,
          name: "Test Lesson",
          slug: "test-lesson",
          blocks: [],
          droplets: [],
          droplet_lessons: [],
          notes: [],
        },
      },
    ],
    dropletNotes: [],
    mappedLessons: [],
    allNotes: {
      dropletId: 1,
      notes: [],
      highlights: [
        {
          id: 1,
          text: "Test highlight",
          color: "#fff300" as HighlightColor,
          position: { start: 0, end: 0 },
          blockId: 1,
          lesson: {
            id: 1,
            name: "Test Lesson",
            slug: "test-lesson",
            blocks: [],
            droplets: [],
            droplet_lessons: [],
            notes: [],
          },
        },
      ],
    },
  };

  it("renders summary and filter sections", () => {
    render(<NotesContainer {...mockProps} />);
    expect(screen.getByText("Filters")).toBeInTheDocument();
  });

  it("handles filter changes", () => {
    render(<NotesContainer {...mockProps} />);
    const filterOptions = screen.getAllByRole("checkbox");
    fireEvent.click(filterOptions[0]);
  });
  // ... existing code ...

  it("renders summary and filter sections", () => {
    render(<NotesContainer {...mockProps} />);

    expect(screen.getByText("Filters")).toBeInTheDocument();
  });

  it("handles filter changes", () => {
    render(<NotesContainer {...mockProps} />);

    const filterOptions = screen.getAllByRole("checkbox");
    fireEvent.click(filterOptions[0]);
  });
});
