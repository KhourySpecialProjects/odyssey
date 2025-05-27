import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NoteBlock } from "@/components/droplets/lessons/note-taking/note-block";
import {
  DropletStatus,
  DropletType,
  FocusArea,
  HighlightColor,
  Tag,
} from "@/types";
import { updateNoteContent } from "@/lib/requests/notes";
import userEvent from "@testing-library/user-event";

jest.mock("@/lib/requests/notes", () => ({
  updateNoteContent: jest.fn(),
}));

describe("NoteBlock", () => {
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
    blockId: 2,
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
      blockId: 2,
    },
  };

  const mockProps = {
    note: mockNote,
    onUpdate: jest.fn(),
    disabled: false,
    onDelete: jest.fn(),
    onFocus: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders note content and highlight", () => {
    render(<NoteBlock {...mockProps} />);

    expect(screen.getByText("Highlighted text")).toBeInTheDocument();
    expect(screen.getByText("Test note content")).toBeInTheDocument();
  });

  const mockOnUpdate = jest.fn();
  const mockOnDelete = jest.fn();
  const mockOnFocus = jest.fn();

  beforeEach(() => {
    (updateNoteContent as jest.Mock).mockResolvedValue({ success: true });
  });

  it("renders note content and highlight", () => {
    render(
      <NoteBlock
        note={mockNote}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onFocus={mockOnFocus}
      />,
    );

    expect(screen.getByText("Highlighted text")).toBeInTheDocument();
    expect(screen.getByText("Test note content")).toBeInTheDocument();
  });

  it("updates note content on blur", async () => {
    render(
      <NoteBlock
        note={mockNote}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onFocus={mockOnFocus}
      />,
    );

    const editor = screen.getByTestId("editor");
    await userEvent.type(editor, " additional text");
    fireEvent.blur(editor);

    await waitFor(() => {
      expect(updateNoteContent).toHaveBeenCalledWith(
        mockNote.id,
        expect.stringContaining("Test note content"),
      );
      expect(mockOnUpdate).toHaveBeenCalled();
    });
  });

  it("toggles toolbar visibility", async () => {
    render(
      <NoteBlock
        note={mockNote}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onFocus={mockOnFocus}
      />,
    );

    expect(screen.getByTestId("toolbar")).toBeInTheDocument();
    const toggleButton = screen.getByTestId("chevronup");
    await userEvent.click(toggleButton);
  });
});
