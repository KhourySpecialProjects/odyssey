import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ImportLessonModal } from "@/components/ui/import-lesson-modal";
import { toast } from "sonner";

// Mock sonner toast
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe("ImportLessonModal", () => {
  const mockOnClose = jest.fn();
  const mockOnImport = jest.fn();
  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onImport: mockOnImport,
    dropletName: "Test Droplet",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render when isOpen is true", () => {
      render(<ImportLessonModal {...defaultProps} />);
      expect(
        screen.getByText("Import Lesson from Markdown"),
      ).toBeInTheDocument();
    });

    it("should not render when isOpen is false", () => {
      render(<ImportLessonModal {...defaultProps} isOpen={false} />);
      expect(
        screen.queryByText("Import Lesson from Markdown"),
      ).not.toBeInTheDocument();
    });

    it("should display the droplet name", () => {
      render(<ImportLessonModal {...defaultProps} />);
      expect(screen.getByText("Test Droplet")).toBeInTheDocument();
    });

    it("should show format guide when toggled", () => {
      render(<ImportLessonModal {...defaultProps} />);
      const toggleButton = screen.getByText(/View format guide/i);
      fireEvent.click(toggleButton);
      expect(screen.getByText("Standard Markdown")).toBeInTheDocument();
    });

    it("should hide format guide when toggled again", () => {
      render(<ImportLessonModal {...defaultProps} />);
      const toggleButton = screen.getByText(/View format guide/i);

      // Show guide
      fireEvent.click(toggleButton);
      expect(screen.getByText("Standard Markdown")).toBeInTheDocument();

      // Hide guide
      fireEvent.click(screen.getByText(/Hide format guide/i));
      expect(screen.queryByText("Standard Markdown")).not.toBeInTheDocument();
    });
  });

  describe("Textarea Interaction", () => {
    it("should update markdown state when typing in textarea", () => {
      render(<ImportLessonModal {...defaultProps} />);
      const textarea = screen.getByPlaceholderText(/# My Lesson Title/i);

      fireEvent.change(textarea, { target: { value: "# Test Content" } });

      expect(textarea).toHaveValue("# Test Content");
    });

    it("should show character and line count when markdown is entered", () => {
      render(<ImportLessonModal {...defaultProps} />);
      const textarea = screen.getByPlaceholderText(/# My Lesson Title/i);

      fireEvent.change(textarea, { target: { value: "Line 1\nLine 2" } });

      expect(screen.getByText(/2 lines/i)).toBeInTheDocument();
      expect(screen.getByText(/13 characters/i)).toBeInTheDocument();
    });

    it("should not show count when markdown is empty", () => {
      render(<ImportLessonModal {...defaultProps} />);
      expect(screen.queryByText(/lines/i)).not.toBeInTheDocument();
    });
  });

  describe("File Upload", () => {
    it("should trigger file input when upload area is clicked", () => {
      render(<ImportLessonModal {...defaultProps} />);
      const uploadArea = screen.getByText(/Click to upload markdown file/i);

      const fileInput = document.getElementById(
        "file-upload",
      ) as HTMLInputElement;
      const clickSpy = jest.spyOn(fileInput, "click");

      fireEvent.click(uploadArea);

      expect(clickSpy).toHaveBeenCalled();
    });

    it("should accept .md files", () => {
      render(<ImportLessonModal {...defaultProps} />);
      const fileInput = document.getElementById(
        "file-upload",
      ) as HTMLInputElement;

      expect(fileInput.accept).toBe(".md,.markdown");
    });

    it("should load file content into textarea", async () => {
      render(<ImportLessonModal {...defaultProps} />);
      const fileInput = document.getElementById(
        "file-upload",
      ) as HTMLInputElement;

      const file = new File(["# Test Content"], "test.md", {
        type: "text/markdown",
      });

      Object.defineProperty(fileInput, "files", {
        value: [file],
        writable: false,
      });

      fireEvent.change(fileInput);

      await waitFor(() => {
        const textarea = screen.getByPlaceholderText(
          /# My Lesson Title/i,
        ) as HTMLTextAreaElement;
        expect(textarea.value).toBe("# Test Content");
      });
    });

    it("should show success toast after loading file", async () => {
      render(<ImportLessonModal {...defaultProps} />);
      const fileInput = document.getElementById(
        "file-upload",
      ) as HTMLInputElement;

      const file = new File(["# Test"], "test.md", { type: "text/markdown" });

      Object.defineProperty(fileInput, "files", {
        value: [file],
        writable: false,
      });

      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          'File "test.md" loaded successfully',
        );
      });
    });

    it("should reject non-markdown files", async () => {
      render(<ImportLessonModal {...defaultProps} />);
      const fileInput = document.getElementById(
        "file-upload",
      ) as HTMLInputElement;

      const file = new File(["content"], "test.txt", { type: "text/plain" });

      Object.defineProperty(fileInput, "files", {
        value: [file],
        writable: false,
      });

      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Please upload a .md or .markdown file",
        );
      });
    });

    it("should reject files larger than 5MB", async () => {
      render(<ImportLessonModal {...defaultProps} />);
      const fileInput = document.getElementById(
        "file-upload",
      ) as HTMLInputElement;

      const largeContent = "a".repeat(6 * 1024 * 1024); // 6MB
      const file = new File([largeContent], "large.md", {
        type: "text/markdown",
      });

      Object.defineProperty(fileInput, "files", {
        value: [file],
        writable: false,
      });

      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "File is too large. Maximum size is 5MB",
        );
      });
    });

    it("should reset file input after upload", async () => {
      render(<ImportLessonModal {...defaultProps} />);
      const fileInput = document.getElementById(
        "file-upload",
      ) as HTMLInputElement;

      const file = new File(["# Test"], "test.md", { type: "text/markdown" });

      Object.defineProperty(fileInput, "files", {
        value: [file],
        writable: false,
      });

      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(fileInput.value).toBe("");
      });
    });
  });

  describe("Import Button", () => {
    it("should be disabled when markdown is empty", () => {
      render(<ImportLessonModal {...defaultProps} />);
      const importButton = screen.getByRole("button", {
        name: /Import Lesson/i,
      });

      expect(importButton).toBeDisabled();
    });

    it("should be enabled when markdown is present", () => {
      render(<ImportLessonModal {...defaultProps} />);
      const textarea = screen.getByPlaceholderText(/# My Lesson Title/i);
      const importButton = screen.getByRole("button", {
        name: /Import Lesson/i,
      });

      fireEvent.change(textarea, { target: { value: "# Test" } });

      expect(importButton).not.toBeDisabled();
    });

    it("should be disabled while importing", async () => {
      mockOnImport.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100)),
      );

      render(<ImportLessonModal {...defaultProps} />);
      const textarea = screen.getByPlaceholderText(/# My Lesson Title/i);
      const importButton = screen.getByRole("button", {
        name: /Import Lesson/i,
      });

      fireEvent.change(textarea, { target: { value: "# Test" } });
      fireEvent.click(importButton);

      expect(importButton).toBeDisabled();
      expect(screen.getByText(/Importing.../i)).toBeInTheDocument();
    });

    it("should call onImport with markdown content", async () => {
      render(<ImportLessonModal {...defaultProps} />);
      const textarea = screen.getByPlaceholderText(/# My Lesson Title/i);
      const importButton = screen.getByRole("button", {
        name: /Import Lesson/i,
      });

      fireEvent.change(textarea, { target: { value: "# Test Content" } });
      fireEvent.click(importButton);

      await waitFor(() => {
        expect(mockOnImport).toHaveBeenCalledWith("# Test Content");
      });
    });

    it("should clear markdown and close modal after successful import", async () => {
      mockOnImport.mockResolvedValue(undefined);

      render(<ImportLessonModal {...defaultProps} />);
      const textarea = screen.getByPlaceholderText(/# My Lesson Title/i);
      const importButton = screen.getByRole("button", {
        name: /Import Lesson/i,
      });

      fireEvent.change(textarea, { target: { value: "# Test" } });
      fireEvent.click(importButton);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
        expect(textarea).toHaveValue("");
      });
    });

    it("should handle import errors gracefully", async () => {
      mockOnImport.mockRejectedValue(new Error("Import failed"));
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      render(<ImportLessonModal {...defaultProps} />);
      const textarea = screen.getByPlaceholderText(/# My Lesson Title/i);
      const importButton = screen.getByRole("button", {
        name: /Import Lesson/i,
      });

      fireEvent.change(textarea, { target: { value: "# Test" } });
      fireEvent.click(importButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          "Import failed:",
          expect.any(Error),
        );
      });

      consoleSpy.mockRestore();
    });
  });

  describe("Cancel Button", () => {
    it("should call onClose when clicked", () => {
      render(<ImportLessonModal {...defaultProps} />);
      const cancelButton = screen.getByRole("button", { name: /Cancel/i });

      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it("should be disabled while importing", async () => {
      mockOnImport.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100)),
      );

      render(<ImportLessonModal {...defaultProps} />);
      const textarea = screen.getByPlaceholderText(/# My Lesson Title/i);
      const importButton = screen.getByRole("button", {
        name: /Import Lesson/i,
      });
      const cancelButton = screen.getByRole("button", { name: /Cancel/i });

      fireEvent.change(textarea, { target: { value: "# Test" } });
      fireEvent.click(importButton);

      expect(cancelButton).toBeDisabled();
    });
  });

  describe("Format Guide Content", () => {
    it("should display all standard markdown features", () => {
      render(<ImportLessonModal {...defaultProps} />);
      fireEvent.click(screen.getByText(/View format guide/i));

      expect(screen.getByText("# H1")).toBeInTheDocument();
      expect(screen.getByText(/## H2/)).toBeInTheDocument();
      expect(screen.getByText(/### H3/)).toBeInTheDocument();
    });

    it("should display all callout types", () => {
      render(<ImportLessonModal {...defaultProps} />);
      fireEvent.click(screen.getByText(/View format guide/i));

      expect(
        screen.getByText(/%warning This is important/),
      ).toBeInTheDocument();
      expect(screen.getByText(/%question What is this?/)).toBeInTheDocument();
    });

    it("should display quiz examples", () => {
      render(<ImportLessonModal {...defaultProps} />);
      fireEvent.click(screen.getByText(/View format guide/i));

      expect(screen.getByText(/%%true-false/)).toBeInTheDocument();
      expect(screen.getByText(/%%multiple-choice/)).toBeInTheDocument();
    });

    it("should display LaTeX examples", () => {
      render(<ImportLessonModal {...defaultProps} />);
      fireEvent.click(screen.getByText(/View format guide/i));

      expect(
        screen.getByText(/Inline: \$x\^2 \+ y\^2 = r\^2\$/),
      ).toBeInTheDocument();
    });
  });
});
