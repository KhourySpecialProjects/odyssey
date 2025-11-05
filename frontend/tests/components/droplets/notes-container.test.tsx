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
          notes: [],
          orderIndex: 0,
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
            notes: [],
            orderIndex: 0,
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
