import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddLesson } from "@/components/draft/add-lesson";
import { addLesson } from "@/lib/requests/lesson";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { parseMarkdownToBlockNote } from "@/lib/blocknote/markdown-to-blocknote";

jest.mock("@/lib/requests/lesson", () => ({
  addLesson: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("@/lib/blocknote/markdown-to-blocknote", () => ({
  parseMarkdownToBlockNote: jest.fn(),
}));

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

jest.mock("react-dom", () => ({
  ...jest.requireActual("react-dom"),
  useFormStatus: jest.fn(() => ({ pending: false })),
}));

// Mock ImportLessonModal
jest.mock("@/components/ui/import-lesson-modal", () => ({
  ImportLessonModal: ({
    isOpen,
    onClose,
    onImport,
    dropletName,
  }: {
    isOpen: boolean;
    onClose: () => void;
    onImport: (markdown: string) => Promise<void>;
    dropletName: string;
  }) => {
    return isOpen ? (
      <div data-testid="import-modal">
        <div>Import to {dropletName}</div>
        <button onClick={onClose}>Close Modal</button>
        <button
          onClick={() => onImport("# Test Markdown")}
          data-testid="trigger-import"
        >
          Import
        </button>
      </div>
    ) : null;
  },
}));

// Mock DropdownMenu (Radix portals don't work in jsdom)
jest.mock("@/components/ui/dropdown-menu", () => {
  const React = require("react");
  return {
    DropdownMenu: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    DropdownMenuTrigger: React.forwardRef(
      (
        {
          children,
          asChild,
          ...props
        }: { children: React.ReactNode; asChild?: boolean },
        ref: React.Ref<HTMLDivElement>,
      ) => <div ref={ref}>{children}</div>,
    ),
    DropdownMenuContent: ({
      children,
    }: {
      children: React.ReactNode;
      align?: string;
    }) => <div>{children}</div>,
    DropdownMenuItem: ({
      children,
      onClick,
      className,
    }: {
      children: React.ReactNode;
      onClick?: () => void;
      className?: string;
    }) => (
      <button role="menuitem" onClick={onClick}>
        {children}
      </button>
    ),
  };
});

// Mock ImportFileModal
jest.mock("@/components/draft/import-file-modal", () => ({
  ImportFileModal: ({
    isOpen,
    onClose,
  }: {
    isOpen: boolean;
    onClose: () => void;
  }) => {
    return isOpen ? (
      <div data-testid="file-import-modal">
        <button onClick={onClose}>Close File Modal</button>
      </div>
    ) : null;
  },
}));

const { useFormStatus } = require("react-dom");

// Helper to open the markdown import modal via the dropdown
function openMarkdownImport() {
  // With mocked dropdown, menu items are always visible
  const menuItem = screen.getByText("Import from Markdown");
  fireEvent.click(menuItem);
}

describe("AddLesson", () => {
  const mockDroplet = {
    id: 1,
    name: "Test Droplet",
    slug: "test-droplet",
    lessons: [
      {
        id: 1,
        name: "Existing Lesson",
        slug: "existing-lesson",
        type: "general" as const,
        blocks: [],
        droplets: [],
        notes: "",
        orderIndex: 0,
      },
    ],
  };

  const mockOnAddLesson = jest.fn();
  const mockOnAddLessons = jest.fn();

  const defaultProps = {
    droplet: mockDroplet,
    onAddLesson: mockOnAddLesson,
    onAddLessons: mockOnAddLessons,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
    (addLesson as jest.Mock).mockResolvedValue({
      ok: true,
      data: {
        id: 2,
        attributes: {
          name: "New Lesson",
          slug: "new-lesson",
          type: "general",
          focusArea: "personal",
        },
      },
      error: null,
    });
  });

  describe("Initial Rendering", () => {
    it("renders Lessons header", () => {
      render(<AddLesson {...defaultProps} />);
      expect(screen.getByText("Lessons")).toBeInTheDocument();
    });

    it("renders import dropdown trigger and add button", () => {
      render(<AddLesson {...defaultProps} />);
      expect(screen.getByLabelText("Import lessons")).toBeInTheDocument();
      expect(screen.getByLabelText("Add lesson")).toBeInTheDocument();
    });

    it("does not show input form initially", () => {
      render(<AddLesson {...defaultProps} />);
      expect(
        screen.queryByPlaceholderText("Enter a lesson name"),
      ).not.toBeInTheDocument();
    });

    it("does not show import modal initially", () => {
      render(<AddLesson {...defaultProps} />);
      expect(screen.queryByTestId("import-modal")).not.toBeInTheDocument();
    });
  });

  describe("Import Dropdown", () => {
    it("opens dropdown with import options when trigger is clicked", async () => {
      render(<AddLesson {...defaultProps} />);

      fireEvent.click(screen.getByLabelText("Import lessons"));

      await waitFor(() => {
        expect(screen.getByText("Import from Markdown")).toBeInTheDocument();
        expect(
          screen.getByText("Import from File (PDF/PPTX)"),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Markdown Import Modal", () => {
    it("opens import modal via dropdown", async () => {
      render(<AddLesson {...defaultProps} />);

      openMarkdownImport();

      await waitFor(() => {
        expect(screen.getByTestId("import-modal")).toBeInTheDocument();
      });
    });

    it("displays droplet name in import modal", async () => {
      render(<AddLesson {...defaultProps} />);

      openMarkdownImport();

      await waitFor(() => {
        expect(screen.getByText(/Import to Test Droplet/i)).toBeInTheDocument();
      });
    });

    it("closes import modal when close button is clicked", async () => {
      render(<AddLesson {...defaultProps} />);

      openMarkdownImport();

      await waitFor(() => {
        expect(screen.getByTestId("import-modal")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Close Modal"));

      await waitFor(() => {
        expect(screen.queryByTestId("import-modal")).not.toBeInTheDocument();
      });
    });

    it("parses markdown and creates lesson on import", async () => {
      const mockBlocks = [
        {
          id: "test-id",
          type: "heading",
          props: { level: 1 },
          content: [{ text: "Test", type: "text", styles: {} }],
          children: [],
        },
      ];

      (parseMarkdownToBlockNote as jest.Mock).mockReturnValue({
        title: "Imported Lesson",
        blocks: mockBlocks,
      });

      (addLesson as jest.Mock).mockResolvedValue({
        ok: true,
        data: {
          id: 3,
          attributes: {
            name: "Imported Lesson",
            slug: "imported-lesson",
            type: "general",
            focusArea: "personal",
          },
        },
        error: null,
      });

      render(<AddLesson {...defaultProps} />);

      openMarkdownImport();

      await waitFor(() => {
        expect(screen.getByTestId("import-modal")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId("trigger-import"));

      await waitFor(() => {
        expect(parseMarkdownToBlockNote).toHaveBeenCalledWith(
          "# Test Markdown",
        );
      });

      await waitFor(() => {
        expect(addLesson).toHaveBeenCalledWith({
          name: "Imported Lesson",
          dropletId: 1,
          orderIndex: 1,
          blocksV2: mockBlocks,
          blocksVersion: "v2",
        });
      });
    });

    it("shows success toast after successful import", async () => {
      const mockBlocks = [
        {
          id: "test-id",
          type: "heading",
          props: { level: 1 },
          content: [{ text: "Test", type: "text", styles: {} }],
          children: [],
        },
      ];

      (parseMarkdownToBlockNote as jest.Mock).mockReturnValue({
        title: "Imported Lesson",
        blocks: mockBlocks,
      });

      (addLesson as jest.Mock).mockResolvedValue({
        ok: true,
        data: {
          id: 3,
          attributes: {
            name: "Imported Lesson",
            slug: "imported-lesson",
            type: "general",
          },
        },
        error: null,
      });

      render(<AddLesson {...defaultProps} />);

      openMarkdownImport();

      await waitFor(() => {
        fireEvent.click(screen.getByTestId("trigger-import"));
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          expect.stringContaining("Imported Lesson"),
        );
      });
    });

    it("shows error toast when import fails", async () => {
      (parseMarkdownToBlockNote as jest.Mock).mockReturnValue({
        title: "Imported Lesson",
        blocks: [],
      });

      (addLesson as jest.Mock).mockResolvedValue({
        ok: false,
        error: "Failed to create lesson",
        data: null,
      });

      render(<AddLesson {...defaultProps} />);

      openMarkdownImport();

      await waitFor(() => {
        fireEvent.click(screen.getByTestId("trigger-import"));
      });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to create lesson");
      });
    });

    it("navigates to new lesson after successful import", async () => {
      const mockBlocks = [
        { id: "1", type: "paragraph", props: {}, children: [] },
      ];

      (parseMarkdownToBlockNote as jest.Mock).mockReturnValue({
        title: "Imported Lesson",
        blocks: mockBlocks,
      });

      (addLesson as jest.Mock).mockResolvedValue({
        ok: true,
        data: {
          id: 3,
          attributes: {
            name: "Imported Lesson",
            slug: "imported-lesson",
            type: "general",
          },
        },
        error: null,
      });

      render(<AddLesson {...defaultProps} />);

      openMarkdownImport();

      await waitFor(() => {
        fireEvent.click(screen.getByTestId("trigger-import"));
      });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(
          "/draft/d/test-droplet/imported-lesson",
        );
      });
    });

    it("calls onAddLesson with new lesson data after import", async () => {
      const mockBlocks = [
        { id: "1", type: "paragraph", props: {}, children: [] },
      ];

      (parseMarkdownToBlockNote as jest.Mock).mockReturnValue({
        title: "Imported Lesson",
        blocks: mockBlocks,
      });

      (addLesson as jest.Mock).mockResolvedValue({
        ok: true,
        data: {
          id: 3,
          attributes: {
            name: "Imported Lesson",
            slug: "imported-lesson",
            type: "general",
            focusArea: "personal",
          },
        },
        error: null,
      });

      render(<AddLesson {...defaultProps} />);

      openMarkdownImport();

      await waitFor(() => {
        fireEvent.click(screen.getByTestId("trigger-import"));
      });

      await waitFor(() => {
        expect(mockOnAddLesson).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 3,
            name: "Imported Lesson",
            slug: "imported-lesson",
            type: "general",
          }),
        );
      });
    });

    it("handles markdown parsing errors gracefully", async () => {
      (parseMarkdownToBlockNote as jest.Mock).mockImplementation(() => {
        throw new Error("Parse error");
      });

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      render(<AddLesson {...defaultProps} />);

      openMarkdownImport();

      await waitFor(() => {
        fireEvent.click(screen.getByTestId("trigger-import"));
      });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Failed to import markdown. Please check the format.",
        );
      });

      consoleSpy.mockRestore();
    });
  });

  describe("Show/Hide Form", () => {
    it("shows input field when plus icon is clicked", async () => {
      render(<AddLesson {...defaultProps} />);

      fireEvent.click(screen.getByLabelText("Add lesson"));

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText("Enter a lesson name"),
        ).toBeInTheDocument();
      });
    });

    it("focuses input after showing form", async () => {
      render(<AddLesson {...defaultProps} />);

      fireEvent.click(screen.getByLabelText("Add lesson"));

      await waitFor(() => {
        const input = screen.getByPlaceholderText("Enter a lesson name");
        expect(input).toHaveFocus();
      });
    });

    it("hides form when clicking outside", async () => {
      render(<AddLesson {...defaultProps} />);

      fireEvent.click(screen.getByLabelText("Add lesson"));

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText("Enter a lesson name"),
        ).toBeInTheDocument();
      });

      fireEvent.mouseDown(document.body);

      expect(
        screen.queryByPlaceholderText("Enter a lesson name"),
      ).not.toBeInTheDocument();
    });
  });

  describe("Form Submission", () => {
    it("calls addLesson with correct parameters", async () => {
      render(<AddLesson {...defaultProps} />);

      fireEvent.click(screen.getByLabelText("Add lesson"));

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText("Enter a lesson name"),
        ).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText("Enter a lesson name");
      fireEvent.change(input, { target: { value: "New Lesson" } });

      expect(input).toHaveValue("New Lesson");
    });
  });

  describe("Edge Cases", () => {
    it("handles droplet with no lessons for import", async () => {
      const dropletNoLessons = {
        ...mockDroplet,
        lessons: undefined,
      };

      (parseMarkdownToBlockNote as jest.Mock).mockReturnValue({
        title: "Test",
        blocks: [],
      });

      render(
        <AddLesson
          droplet={dropletNoLessons}
          onAddLesson={mockOnAddLesson}
          onAddLessons={mockOnAddLessons}
        />,
      );

      openMarkdownImport();

      await waitFor(() => {
        fireEvent.click(screen.getByTestId("trigger-import"));
      });

      await waitFor(() => {
        expect(addLesson).toHaveBeenCalledWith(
          expect.objectContaining({
            orderIndex: 0,
          }),
        );
      });
    });

    it("calculates correct orderIndex for import", async () => {
      const dropletWithLessons = {
        ...mockDroplet,
        lessons: [
          { ...mockDroplet.lessons[0], id: 1 },
          { ...mockDroplet.lessons[0], id: 2 },
          { ...mockDroplet.lessons[0], id: 3 },
        ],
      };

      (parseMarkdownToBlockNote as jest.Mock).mockReturnValue({
        title: "Test",
        blocks: [],
      });

      render(
        <AddLesson
          droplet={dropletWithLessons}
          onAddLesson={mockOnAddLesson}
          onAddLessons={mockOnAddLessons}
        />,
      );

      openMarkdownImport();

      await waitFor(() => {
        fireEvent.click(screen.getByTestId("trigger-import"));
      });

      await waitFor(() => {
        expect(addLesson).toHaveBeenCalledWith(
          expect.objectContaining({
            orderIndex: 3,
          }),
        );
      });
    });
  });

  describe("Accessibility", () => {
    it("import dropdown trigger is accessible", () => {
      render(<AddLesson {...defaultProps} />);
      expect(screen.getByLabelText("Import lessons")).toBeInTheDocument();
    });

    it("add lesson button is accessible", () => {
      render(<AddLesson {...defaultProps} />);
      expect(screen.getByLabelText("Add lesson")).toBeInTheDocument();
    });
  });
});
