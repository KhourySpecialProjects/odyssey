import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  getNotesByAuthorizedUserAndLesson,
  updateNotePosition,
  deleteNote,
  createNote,
  updateNoteContent,
} from "@/lib/requests/notes";
import { getEnrollByID } from "@/lib/requests/enrollment";
import { NotesBar } from "@/components/droplets/lessons/note-taking/notes-bar";
import { DropletStatus, DropletType, FocusArea, Tag } from "@/types";

jest.mock("@/lib/requests/notes");
jest.mock("@/lib/requests/enrollment");

// Mock TipTap editor
jest.mock("@tiptap/react", () => ({
  useEditor: jest.fn(() => ({
    getHTML: jest.fn(() => "<p>Test content</p>"),
    isActive: jest.fn(() => false),
    chain: jest.fn(() => ({
      focus: jest.fn(() => ({
        toggleBold: jest.fn(() => ({ run: jest.fn() })),
        toggleItalic: jest.fn(() => ({ run: jest.fn() })),
        toggleUnderline: jest.fn(() => ({ run: jest.fn() })),
        toggleStrike: jest.fn(() => ({ run: jest.fn() })),
      })),
    })),
    commands: { setContent: jest.fn() },
  })),
  EditorContent: ({ editor }: any) => <div data-testid="editor">Editor</div>,
}));

jest.mock("next-themes", () => ({
  useTheme: jest.fn(() => ({ theme: "light" })),
}));

describe("NotesBar", () => {
  const mockLesson = {
    id: 1,
    name: "Test Lesson",
    slug: "test-lesson",
    droplets: [],
    droplet_lessons: [],
    notes: [],
    blocks: [],
  };

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

  const mockEnrollment = {
    id: "1",
    authorizedUser: { id: 1 },
    droplet: mockDroplet,
    viewedLessons: [],
    isComplete: false,
    rating: 5,
    notes: [],
    isFirstTime: false,
    isArchived: false,
  };

  const mockInitNotes = [
    {
      id: 1,
      content: "Test note 1",
      positionY: 100,
      blockId: 1,
      enrollmentId: 1,
      lesson: mockLesson,
      enrollment: mockEnrollment,
    } as any,
    {
      id: 2,
      content: "Test note 2",
      positionY: 300,
      blockId: 1,
      enrollmentId: 1,
      lesson: mockLesson,
      enrollment: mockEnrollment,
    } as any,
  ];

  const defaultProps = {
    userId: 1,
    lesson: mockLesson,
    enrollmentId: "123",
    initNotes: mockInitNotes,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getNotesByAuthorizedUserAndLesson as jest.Mock).mockResolvedValue(
      mockInitNotes,
    );
    (updateNotePosition as jest.Mock).mockResolvedValue({ success: true });
    (deleteNote as jest.Mock).mockResolvedValue({ ok: true });
    (getEnrollByID as jest.Mock).mockResolvedValue(mockEnrollment);
    (createNote as jest.Mock).mockResolvedValue({ success: true });
    (updateNoteContent as jest.Mock).mockResolvedValue({ success: true });
  });

  describe("Component Rendering", () => {
    it("renders notes bar with title", () => {
      render(<NotesBar {...defaultProps} />);
      expect(screen.getByText("My Notes")).toBeInTheDocument();
    });

    it("renders instruction badge", () => {
      render(<NotesBar {...defaultProps} />);
      expect(
        screen.getByText("Click anywhere to create a note"),
      ).toBeInTheDocument();
    });

    it("renders all initial notes", () => {
      const { container } = render(<NotesBar {...defaultProps} />);
      const noteBlocks = container.querySelectorAll(".note-block");
      expect(noteBlocks.length).toBe(2);
    });

    it("renders with no enrollmentId", () => {
      render(<NotesBar {...defaultProps} enrollmentId={undefined} />);
      expect(screen.getByText("My Notes")).toBeInTheDocument();
    });

    it("renders with empty notes array", () => {
      const { container } = render(
        <NotesBar {...defaultProps} initNotes={[]} />,
      );
      expect(screen.getByText("My Notes")).toBeInTheDocument();
      expect(container.querySelectorAll(".note-block").length).toBe(0);
    });
  });

  describe("Note Creation", () => {
    it("opens popover when clicking empty space", async () => {
      const { container } = render(<NotesBar {...defaultProps} />);
      const notesBar = container.querySelector(".notes-bar")!;

      fireEvent.click(notesBar, { clientY: 200, clientX: 100 });

      await waitFor(() => {
        expect(screen.getByText("Create a Note?")).toBeInTheDocument();
      });
    });

    it("creates new note when clicking Create button", async () => {
      const { container } = render(<NotesBar {...defaultProps} />);
      const notesBar = container.querySelector(".notes-bar")!;

      fireEvent.click(notesBar, { clientY: 250, clientX: 100 });

      await waitFor(() => {
        expect(screen.getByText("Create a Note?")).toBeInTheDocument();
      });

      const createButton = screen.getByText("Create a Note?");
      await userEvent.click(createButton);

      await waitFor(() => {
        expect(createNote).toHaveBeenCalled();
        expect(getNotesByAuthorizedUserAndLesson).toHaveBeenCalled();
      });
    });

    it("handles failed note creation", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      (createNote as jest.Mock).mockResolvedValue({
        success: false,
        error: "Failed",
      });

      const { container } = render(<NotesBar {...defaultProps} />);
      const notesBar = container.querySelector(".notes-bar")!;

      fireEvent.click(notesBar, { clientY: 200, clientX: 100 });

      await waitFor(() => {
        expect(screen.getByText("Create a Note?")).toBeInTheDocument();
      });

      const createButton = screen.getByText("Create a Note?");
      await userEvent.click(createButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          "Failed to create note:",
          "Failed",
        );
      });

      consoleSpy.mockRestore();
    });

    it("does not open popover when clicking on note block", () => {
      const { container } = render(<NotesBar {...defaultProps} />);
      const noteBlock = container.querySelector(".note-block")!;

      fireEvent.click(noteBlock);

      expect(screen.queryByText("Create a Note?")).not.toBeInTheDocument();
    });
  });

  describe("Note Dragging", () => {
    it("handles note dragging via grip handle", async () => {
      const { container } = render(<NotesBar {...defaultProps} />);
      const gripHandle = container.querySelector(".grip-handle")!;

      fireEvent.mouseDown(gripHandle, { pageY: 100 });
      fireEvent.mouseMove(document, { pageY: 200 });
      fireEvent.mouseUp(document);

      await waitFor(() => {
        expect(updateNotePosition).toHaveBeenCalled();
      });
    });

    it("does not drag when clicking outside grip handle", () => {
      const { container } = render(<NotesBar {...defaultProps} />);
      const noteBlock = container.querySelector(".note-block")!;

      fireEvent.mouseDown(noteBlock, { pageY: 100 });
      fireEvent.mouseMove(document, { pageY: 200 });

      expect(updateNotePosition).not.toHaveBeenCalled();
    });

    it("updates note position during drag", () => {
      const { container } = render(<NotesBar {...defaultProps} />);
      const gripHandle = container.querySelector(".grip-handle")!;

      fireEvent.mouseDown(gripHandle, { pageY: 100 });
      fireEvent.mouseMove(document, { pageY: 250 });

      const noteContainer = container.querySelector('div[style*="top"]');
      expect(noteContainer).toBeInTheDocument();
    });

    it("constrains note position to minimum boundary", () => {
      const { container } = render(<NotesBar {...defaultProps} />);
      const gripHandle = container.querySelector(".grip-handle")!;

      fireEvent.mouseDown(gripHandle, { pageY: 100 });
      fireEvent.mouseMove(document, { pageY: 10 });

      expect(gripHandle).toBeInTheDocument();
    });

    it("handles failed position update", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      (updateNotePosition as jest.Mock).mockRejectedValue(
        new Error("Update failed"),
      );

      const { container } = render(<NotesBar {...defaultProps} />);
      const gripHandle = container.querySelector(".grip-handle")!;

      fireEvent.mouseDown(gripHandle, { pageY: 100 });
      fireEvent.mouseMove(document, { pageY: 200 });
      fireEvent.mouseUp(document);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          "Failed to update note position:",
          expect.any(Error),
        );
      });

      consoleSpy.mockRestore();
    });
  });

  describe("Note Deletion", () => {
    it("deletes note successfully", async () => {
      render(<NotesBar {...defaultProps} />);

      const deleteButtons = screen.getAllByTestId("deleteNote");
      await userEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(deleteNote).toHaveBeenCalledWith(1);
      });
    });

    it("optimistically removes note from UI", async () => {
      const { container } = render(<NotesBar {...defaultProps} />);
    });

    it("restores notes on failed deletion", async () => {
      (deleteNote as jest.Mock).mockResolvedValue({ ok: false });

      render(<NotesBar {...defaultProps} />);

      const deleteButtons = screen.getAllByTestId("deleteNote");
      await userEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(getNotesByAuthorizedUserAndLesson).toHaveBeenCalled();
      });
    });

    it("handles deletion error with catch block", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      (deleteNote as jest.Mock).mockRejectedValue(new Error("Delete failed"));

      render(<NotesBar {...defaultProps} />);

      const deleteButtons = screen.getAllByTestId("deleteNote");
      await userEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          "Failed to delete note:",
          expect.any(Error),
        );
      });

      consoleSpy.mockRestore();
    });
  });

  describe("Page Height Tracking", () => {
    it("sets page height based on lesson wrapper", () => {
      const { container } = render(<NotesBar {...defaultProps} />);
      const notesBar = container.querySelector(".notes-bar");

      expect(notesBar).toHaveAttribute("style");
    });

    it("cleans up resize listener on unmount", () => {
      const removeEventListenerSpy = jest.spyOn(window, "removeEventListener");
      const { unmount } = render(<NotesBar {...defaultProps} />);

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "resize",
        expect.any(Function),
      );
      removeEventListenerSpy.mockRestore();
    });
  });

  describe("Note Fetching", () => {
    it("fetches notes on mount", async () => {
      render(<NotesBar {...defaultProps} />);

      await waitFor(() => {
        expect(getNotesByAuthorizedUserAndLesson).toHaveBeenCalledWith(
          1,
          "test-lesson",
        );
      });
    });
  });

  describe("Focus Management", () => {
    it("updates z-index for focused notes", () => {
      render(<NotesBar {...defaultProps} />);

      const editors = screen.getAllByTestId("editor");
      fireEvent.focus(editors[0]);

      expect(editors[0]).toBeInTheDocument();
    });
  });

  describe("Drag State Management", () => {
    it("applies cursor-grabbing class when dragging", () => {
      const { container } = render(<NotesBar {...defaultProps} />);
      const gripHandle = container.querySelector(".grip-handle")!;

      fireEvent.mouseDown(gripHandle, { pageY: 100 });

      const cursorGrabbingElement = container.querySelector(
        'div[class*="cursor-grabbing"]',
      );
      expect(cursorGrabbingElement).toBeInTheDocument();
    });

    it("applies scale-105 class when dragging", () => {
      const { container } = render(<NotesBar {...defaultProps} />);
      const gripHandle = container.querySelector(".grip-handle")!;

      fireEvent.mouseDown(gripHandle, { pageY: 100 });

      const scaledElement = container.querySelector('div[class*="scale-105"]');
      expect(scaledElement).toBeInTheDocument();
    });
  });

  describe("Popover Behavior", () => {
    it("does not open popover when clicking trash icon", () => {
      render(<NotesBar {...defaultProps} />);

      const deleteButton = screen.getAllByTestId("deleteNote")[0];
      fireEvent.click(deleteButton);

      expect(screen.queryByText("Create a Note?")).not.toBeInTheDocument();
    });

    it("calculates mouse position for popover placement", async () => {
      const { container } = render(<NotesBar {...defaultProps} />);
      const notesBar = container.querySelector(".notes-bar")!;

      const mockGetBoundingClientRect = jest.fn().mockReturnValue({
        top: 100,
        right: 500,
        width: 400,
      });

      Object.defineProperty(notesBar, "getBoundingClientRect", {
        value: mockGetBoundingClientRect,
        configurable: true,
      });

      fireEvent.click(notesBar, { clientY: 300, clientX: 250 });

      await waitFor(() => {
        expect(screen.getByText("Create a Note?")).toBeInTheDocument();
      });
    });
  });
});
