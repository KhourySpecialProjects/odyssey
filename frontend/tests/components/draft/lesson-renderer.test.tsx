import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LessonRenderer } from "@/components/draft/lesson/lesson-renderer";
import { useRouter } from "next/navigation";
import {
  updateLesson,
  deleteLesson,
  getLatestLessonContent,
} from "@/lib/requests/lesson";
import { getDropletBySlug } from "@/lib/requests/droplet";
import { toast } from "sonner";

jest.mock("@/components/ui/tiptap/lesson-name-input", () => ({
  LessonNameInput: ({ initialContent, updateContent, className }: any) => (
    <div data-testid="lesson-name-input" className={className}>
      <input
        type="text"
        defaultValue={initialContent}
        onChange={(e) => updateContent(e.target.value)}
        data-testid="lesson-name-field"
      />
    </div>
  ),
}));

jest.mock("@/components/draft/lesson/block_list", () => ({
  __esModule: true,
  default: ({ blocks, deleteBlock, onReorder, setBlock }: any) => (
    <div data-testid="draggable-block-list">
      {blocks.map((block: any, index: number) => (
        <div key={block.id || index} data-testid={`block-${block.__component}`}>
          Block: {block.__component}
          <button
            onClick={() => deleteBlock(index)()}
            data-testid={`delete-block-${index}`}
          >
            Delete Block {index}
          </button>
          <button
            onClick={() => onReorder(index, index + 1)}
            data-testid={`reorder-block-${index}`}
          >
            Reorder Block {index}
          </button>
          <button
            onClick={() => setBlock(index)({ content: "Updated content" })}
            data-testid={`update-block-${index}`}
          >
            Update Block
          </button>
        </div>
      ))}
    </div>
  ),
}));

jest.mock("@/components/draft/lesson/delete-lesson", () => ({
  DeleteLessonButton: ({ deleteLesson }: any) => (
    <button onClick={deleteLesson} data-testid="delete-lesson-button">
      Delete Lesson
    </button>
  ),
}));

jest.mock("@/lib/requests/lesson", () => ({
  updateLesson: jest.fn(),
  deleteLesson: jest.fn(),
  revalidateLesson: jest.fn().mockResolvedValue(undefined),
  getLatestLessonContent: jest.fn(),
}));

const mockUseEditingLock = jest.fn().mockReturnValue({
  isLocked: true,
  isOwnLock: true,
  lockedBy: null,
  isLoading: false,
  error: null,
  release: jest.fn(),
});
jest.mock("@/hooks/useEditingLock", () => ({
  useEditingLock: (...args: unknown[]) => mockUseEditingLock(...args),
}));

jest.mock("@/lib/requests/droplet", () => ({
  getDropletBySlug: jest.fn(),
}));

jest.mock("@/components/draft/lesson/blocknote-editor", () => ({
  BlockNoteEditor: ({
    editable,
    initialContent,
  }: {
    editable: boolean;
    initialContent?: unknown;
  }) => (
    <div
      data-testid="blocknote-editor"
      data-editable={String(editable)}
      data-content={JSON.stringify(initialContent ?? null)}
    />
  ),
}));

jest.mock("@/lib/pyodide/pyodide-context", () => ({
  PyodideProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock("@/lib/utils", () => ({
  htmlToText: jest.fn((text) => text.replace(/<[^>]*>/g, "")),
  cn: jest.fn((...args) => args.filter(Boolean).join(" ")),
}));

// Mock lodash debounce to execute immediately
jest.mock("lodash", () => ({
  debounce: (fn: any) => {
    const debounced = fn;
    debounced.cancel = jest.fn();
    return debounced;
  },
}));

describe("LessonRenderer", () => {
  const mockRouter = {
    replace: jest.fn(),
    push: jest.fn(),
  };

  const mockLesson = {
    id: 1,
    name: "Test Lesson",
    slug: "test-lesson",
    type: "standard",
    droplets: [],
    notes: "",
    orderIndex: 1,
    blocks: [
      {
        id: 1,
        __component: "droplets.generic" as const,
        content: "Generic content",
      },
      {
        id: 2,
        __component: "droplets.video" as const,
        url: "https://example.com/video",
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (updateLesson as jest.Mock).mockResolvedValue({
      ok: true,
      data: { attributes: { slug: "updated-slug" } },
    });
    (getDropletBySlug as jest.Mock).mockResolvedValue({ id: 1 });
    (deleteLesson as jest.Mock).mockResolvedValue({ ok: true });
  });

  describe("Initial Rendering", () => {
    it("renders lesson name as heading", () => {
      render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

      expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    });

    it("renders all blocks", () => {
      render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

      expect(screen.getByTestId("block-droplets.generic")).toBeInTheDocument();
      expect(screen.getByTestId("block-droplets.video")).toBeInTheDocument();
    });

    it("renders Change URL button", () => {
      render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

      expect(
        screen.getByRole("button", { name: "Change URL" }),
      ).toBeInTheDocument();
    });

    it("renders delete lesson button", () => {
      render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

      expect(screen.getByTestId("delete-lesson-button")).toBeInTheDocument();
    });

    it("does not show URL slug popup initially", () => {
      render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

      expect(screen.queryByText("Enter New URL Slug")).not.toBeInTheDocument();
    });

    it("initializes with lesson blocks", () => {
      render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

      const blocks = screen.getAllByText(/Block:/);
      expect(blocks).toHaveLength(2);
    });

    it("initializes with lesson name", () => {
      render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

      expect(screen.getByText("Test Lesson")).toBeInTheDocument();
    });
  });

  describe("Lesson Name Updates", () => {
    it("updates lesson name on input change", async () => {
      render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

      fireEvent.click(screen.getByLabelText("Edit lesson title"));
      const nameField = screen.getByTestId("lesson-name-field");
      fireEvent.change(nameField, { target: { value: "Updated Lesson Name" } });
    });

    it("navigates to new slug after name update", async () => {
      (updateLesson as jest.Mock).mockResolvedValue({
        ok: true,
        data: { attributes: { slug: "updated-lesson-name" } },
      });

      render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

      fireEvent.click(screen.getByLabelText("Edit lesson title"));
      const nameField = screen.getByTestId("lesson-name-field");
      fireEvent.change(nameField, { target: { value: "Updated Lesson Name" } });
    });

    it("handles name update errors gracefully", async () => {
      (updateLesson as jest.Mock).mockResolvedValue({
        error: "Update failed",
      });

      render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

      fireEvent.click(screen.getByLabelText("Edit lesson title"));
      const nameField = screen.getByTestId("lesson-name-field");
      fireEvent.change(nameField, { target: { value: "New Name" } });

      expect(mockRouter.replace).not.toHaveBeenCalled();
    });
  });

  describe("URL Slug Change", () => {
    it("opens slug change popup when Change URL is clicked", () => {
      render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

      fireEvent.click(screen.getByRole("button", { name: "Change URL" }));

      expect(screen.getByText("Enter New URL Slug")).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("e.g., my-new-url-slug"),
      ).toBeInTheDocument();
    });

    it("closes popup when Cancel is clicked", () => {
      render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

      fireEvent.click(screen.getByRole("button", { name: "Change URL" }));
      fireEvent.click(screen.getByText("Cancel"));

      expect(screen.queryByText("Enter New URL Slug")).not.toBeInTheDocument();
    });

    it("updates slug input value", () => {
      render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

      fireEvent.click(screen.getByRole("button", { name: "Change URL" }));

      const slugInput = screen.getByPlaceholderText(
        "e.g., my-new-url-slug",
      ) as HTMLInputElement;
      fireEvent.change(slugInput, { target: { value: "new-slug" } });

      expect(slugInput.value).toBe("new-slug");
    });

    it("does not call update with empty slug", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

      fireEvent.click(screen.getByRole("button", { name: "Change URL" }));
      fireEvent.click(screen.getByText("Confirm"));

      expect(updateLesson).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith("New slug cannot be empty");

      consoleErrorSpy.mockRestore();
    });

    it("does not call update with whitespace-only slug", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

      fireEvent.click(screen.getByRole("button", { name: "Change URL" }));

      const slugInput = screen.getByPlaceholderText("e.g., my-new-url-slug");
      fireEvent.change(slugInput, { target: { value: "   " } });
      fireEvent.click(screen.getByText("Confirm"));

      expect(updateLesson).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it("updates slug successfully and navigates", async () => {
      (updateLesson as jest.Mock).mockResolvedValue({
        ok: true,
        data: { attributes: { slug: "new-custom-slug" } },
      });

      render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

      fireEvent.click(screen.getByRole("button", { name: "Change URL" }));

      const slugInput = screen.getByPlaceholderText("e.g., my-new-url-slug");
      fireEvent.change(slugInput, { target: { value: "new-custom-slug" } });
      fireEvent.click(screen.getByText("Confirm"));

      await waitFor(() => {
        expect(updateLesson).toHaveBeenCalledWith(
          1,
          { name: "Test Lesson", slug: "new-custom-slug" },
          { regenerateSlug: false },
        );
      });

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith(
          "/draft/d/test-droplet/new-custom-slug",
        );
      });
    });

    it("shows error toast when slug already exists", async () => {
      (updateLesson as jest.Mock).mockResolvedValue({
        ok: false,
        error: "Slug already exists",
      });

      render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

      fireEvent.click(screen.getByRole("button", { name: "Change URL" }));

      const slugInput = screen.getByPlaceholderText("e.g., my-new-url-slug");
      fireEvent.change(slugInput, { target: { value: "existing-slug" } });
      fireEvent.click(screen.getByText("Confirm"));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "A lesson with that slug already exists",
        );
      });
    });

    it("closes popup after successful slug update", async () => {
      (updateLesson as jest.Mock).mockResolvedValue({
        ok: true,
        data: { attributes: { slug: "new-slug" } },
      });

      render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

      fireEvent.click(screen.getByRole("button", { name: "Change URL" }));

      const slugInput = screen.getByPlaceholderText("e.g., my-new-url-slug");
      fireEvent.change(slugInput, { target: { value: "new-slug" } });
      fireEvent.click(screen.getByText("Confirm"));

      await waitFor(() => {
        expect(
          screen.queryByText("Enter New URL Slug"),
        ).not.toBeInTheDocument();
      });
    });

    it("trims whitespace from slug input", async () => {
      (updateLesson as jest.Mock).mockResolvedValue({
        ok: true,
        data: { attributes: { slug: "trimmed-slug" } },
      });

      render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

      fireEvent.click(screen.getByRole("button", { name: "Change URL" }));

      const slugInput = screen.getByPlaceholderText("e.g., my-new-url-slug");
      fireEvent.change(slugInput, { target: { value: "  trimmed-slug  " } });
      fireEvent.click(screen.getByText("Confirm"));

      await waitFor(() => {
        expect(updateLesson).toHaveBeenCalledWith(
          1,
          { name: "Test Lesson", slug: "trimmed-slug" },
          { regenerateSlug: false },
        );
      });
    });
  });

  describe("Block Management", () => {
    it("renders different block types", () => {
      const lessonWithAllBlocks = {
        ...mockLesson,
        blocks: [
          { __component: "droplets.generic" as const, id: 1, content: "" },
          { __component: "droplets.video" as const, id: 2, url: "" },
          {
            __component: "droplets.expandable" as const,
            id: 3,
            title: "",
            content: "",
          },
          {
            __component: "droplets.callout" as const,
            id: 4,
            content: [
              { type: "paragraph", children: [{ type: "text", text: "" }] },
            ],
            color: "blue",
            type: "info",
          },
          {
            __component: "droplets.quiz" as const,
            id: 5,
            questions: [],
          },
          {
            __component: "droplets.open-ended-quiz" as const,
            id: 6,
            questions: [],
          },
        ],
      };

      render(
        <LessonRenderer
          lesson={lessonWithAllBlocks}
          dropletSlug="test-droplet"
        />,
      );

      expect(screen.getByTestId("block-droplets.generic")).toBeInTheDocument();
      expect(screen.getByTestId("block-droplets.video")).toBeInTheDocument();
      expect(
        screen.getByTestId("block-droplets.expandable"),
      ).toBeInTheDocument();
      expect(screen.getByTestId("block-droplets.callout")).toBeInTheDocument();
      expect(screen.getByTestId("block-droplets.quiz")).toBeInTheDocument();
      expect(
        screen.getByTestId("block-droplets.open-ended-quiz"),
      ).toBeInTheDocument();
    });

    it("handles lesson with no blocks", () => {
      const emptyLesson = {
        ...mockLesson,
        blocks: [],
      };

      render(
        <LessonRenderer lesson={emptyLesson} dropletSlug="test-droplet" />,
      );

      expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    });

    it("handles lesson with single block", () => {
      const singleBlockLesson = {
        ...mockLesson,
        blocks: [
          {
            __component: "droplets.generic" as const,
            id: 1,
            content: "Content",
          },
        ],
      };

      render(
        <LessonRenderer
          lesson={singleBlockLesson}
          dropletSlug="test-droplet"
        />,
      );

      expect(screen.getByTestId("block-droplets.generic")).toBeInTheDocument();
    });

    it("calls updateLesson when blocks change", async () => {
      render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

      const updateButton = screen.getByTestId("update-block-0");
      fireEvent.click(updateButton);
    });

    it("deletes block and updates backend", async () => {
      (updateLesson as jest.Mock).mockResolvedValue({
        ok: true,
        data: { attributes: { slug: "test-lesson" } }, // Add this structure
      });

      render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

      const deleteButton = screen.getByTestId("delete-block-0");
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(updateLesson).toHaveBeenCalled();
      });
    });

    it("reorders blocks correctly", async () => {
      render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

      const reorderButton = screen.getByTestId("reorder-block-0");
      fireEvent.click(reorderButton);
    });
  });

  describe("Delete Lesson", () => {
    it("deletes lesson and navigates", async () => {
      (getDropletBySlug as jest.Mock).mockResolvedValue({ id: 5 });
      (deleteLesson as jest.Mock).mockResolvedValue({ ok: true });

      render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

      const deleteButton = screen.getByTestId("delete-lesson-button");
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(getDropletBySlug).toHaveBeenCalledWith("test-droplet", {
          fields: ["id"],
          populate: {},
        });
      });

      await waitFor(() => {
        expect(deleteLesson).toHaveBeenCalledWith(1, true);
      });

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith(
          "/draft/d/test-droplet",
        );
      });
    });

    it("handles delete errors gracefully", async () => {
      // Mock updateLesson to not trigger navigation for this test
      (updateLesson as jest.Mock).mockResolvedValue({
        ok: false, // Make it fail so it doesn't trigger router.replace
        error: "Update failed",
      });

      (deleteLesson as jest.Mock).mockResolvedValue({ error: "Delete failed" });

      render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

      // Clear any calls that happened during render/setup
      mockRouter.replace.mockClear();

      const deleteButton = screen.getByTestId("delete-lesson-button");
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(deleteLesson).toHaveBeenCalled();
      });

      // Wait a bit to ensure no async navigation happens
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockRouter.replace).not.toHaveBeenCalled();
    });
  });

  describe("Lesson Updates", () => {
    it("syncs blocks when lesson prop changes", () => {
      const { rerender } = render(
        <LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />,
      );

      expect(screen.getByTestId("block-droplets.generic")).toBeInTheDocument();

      const updatedLesson = {
        ...mockLesson,
        blocks: [
          {
            __component: "droplets.callout" as const,
            id: 3,
            content: [
              {
                type: "paragraph",
                children: [{ type: "text", text: "New content" }],
              },
            ],
            color: "blue",
            type: "info",
          },
        ],
      };

      rerender(
        <LessonRenderer lesson={updatedLesson} dropletSlug="test-droplet" />,
      );

      expect(screen.getByTestId("block-droplets.callout")).toBeInTheDocument();
      expect(
        screen.queryByTestId("block-droplets.generic"),
      ).not.toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles lesson with very long name", () => {
      const longNameLesson = {
        ...mockLesson,
        name: "A".repeat(200),
      };

      render(
        <LessonRenderer lesson={longNameLesson} dropletSlug="test-droplet" />,
      );

      expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    });

    it("handles lesson with special characters in name", () => {
      const specialNameLesson = {
        ...mockLesson,
        name: "Lesson & <Special> Characters",
      };

      render(
        <LessonRenderer
          lesson={specialNameLesson}
          dropletSlug="test-droplet"
        />,
      );

      expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    });

    it("handles blocks without id", () => {
      const blocksWithoutId = {
        ...mockLesson,
        blocks: [
          { __component: "droplets.generic" as const, content: "No ID" },
        ],
      };

      render(
        <LessonRenderer lesson={blocksWithoutId} dropletSlug="test-droplet" />,
      );

      expect(screen.getByTestId("block-droplets.generic")).toBeInTheDocument();
    });

    it("handles empty dropletSlug", async () => {
      render(<LessonRenderer lesson={mockLesson} dropletSlug="" />);

      expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    });
  });

  describe("Styling", () => {
    it("applies correct classes to lesson name input when editing", () => {
      render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

      fireEvent.click(screen.getByLabelText("Edit lesson title"));

      const nameInput = screen.getByTestId("lesson-name-input");
      expect(nameInput).toHaveClass("w-full");
    });

    it("confirm button has correct styling", () => {
      render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

      fireEvent.click(screen.getByRole("button", { name: "Change URL" }));

      const confirmButton = screen.getByText("Confirm");
      expect(confirmButton).toHaveClass("bg-sky-600");
      expect(confirmButton).toHaveClass("text-white");
      expect(confirmButton).toHaveClass("hover:bg-sky-700");
    });

    it("popup has correct styling classes", () => {
      render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

      fireEvent.click(screen.getByRole("button", { name: "Change URL" }));

      // Dialog renders in a portal outside container, query from document
      const popup = document.querySelector(".fixed.inset-0");
      expect(popup).toHaveClass("z-50");
      expect(popup).toHaveClass("bg-black/80");
    });

    it("applies dark mode classes to popup", () => {
      render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

      fireEvent.click(screen.getByRole("button", { name: "Change URL" }));

      // "Enter New URL Slug" is in DialogTitle > DialogHeader > DialogContent
      const popupContent =
        screen.getByText("Enter New URL Slug").parentElement?.parentElement;
      expect(popupContent).toHaveClass("dark:bg-slate-900");
    });
  });

  describe("Accessibility", () => {
    it("popup input has placeholder", () => {
      render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

      fireEvent.click(screen.getByRole("button", { name: "Change URL" }));

      const input = screen.getByPlaceholderText("e.g., my-new-url-slug");
      expect(input).toBeInTheDocument();
    });

    it("buttons have descriptive text", () => {
      render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

      expect(
        screen.getByRole("button", { name: "Change URL" }),
      ).toBeInTheDocument();
      expect(screen.getByTestId("delete-lesson-button")).toBeInTheDocument();
    });

    it("popup has heading", () => {
      render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

      fireEvent.click(screen.getByRole("button", { name: "Change URL" }));

      expect(screen.getByText("Enter New URL Slug")).toBeInTheDocument();
    });
  });

  describe("Editing Lock", () => {
    it("shows lock banner when locked by another user", () => {
      mockUseEditingLock.mockReturnValue({
        isLocked: true,
        isOwnLock: false,
        lockedBy: { id: 99, firstName: "Jane", lastName: "Doe" },
        isLoading: false,
        error: null,
        release: jest.fn(),
      });

      render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

      expect(screen.getByText(/Jane Doe/)).toBeInTheDocument();
      expect(
        screen.getByText(/is currently editing this lesson/),
      ).toBeInTheDocument();
    });

    it("hides action buttons when locked by another user", () => {
      mockUseEditingLock.mockReturnValue({
        isLocked: true,
        isOwnLock: false,
        lockedBy: { id: 99, firstName: "Jane", lastName: "Doe" },
        isLoading: false,
        error: null,
        release: jest.fn(),
      });

      render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

      expect(screen.queryByText("Change URL")).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("delete-lesson-button"),
      ).not.toBeInTheDocument();
    });

    it("shows loading state while acquiring lock", () => {
      mockUseEditingLock.mockReturnValue({
        isLocked: false,
        isOwnLock: false,
        lockedBy: null,
        isLoading: true,
        error: null,
        release: jest.fn(),
      });

      render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

      expect(
        screen.getByText("Checking editing access..."),
      ).toBeInTheDocument();
    });

    it("shows edit controls when user holds the lock", () => {
      mockUseEditingLock.mockReturnValue({
        isLocked: true,
        isOwnLock: true,
        lockedBy: null,
        isLoading: false,
        error: null,
        release: jest.fn(),
      });

      render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

      expect(
        screen.getByRole("button", { name: "Change URL" }),
      ).toBeInTheDocument();
      expect(screen.getByTestId("delete-lesson-button")).toBeInTheDocument();
      expect(
        screen.queryByText(/is currently editing/),
      ).not.toBeInTheDocument();
    });

    it("shows error banner when lock acquisition fails", () => {
      mockUseEditingLock.mockReturnValue({
        isLocked: false,
        isOwnLock: false,
        lockedBy: null,
        isLoading: false,
        error: "Could not resolve your user account",
        release: jest.fn(),
      });

      render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

      expect(
        screen.getByText(/Unable to acquire editing lock/),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Could not resolve your user account/),
      ).toBeInTheDocument();
    });
  });

  describe("Review freeze", () => {
    const lockState = (over: Record<string, unknown> = {}) => ({
      isLocked: false,
      isOwnLock: false,
      lockedBy: null,
      isLoading: false,
      error: null,
      inReview: true,
      isReviewer: false,
      reviewEnded: false,
      release: jest.fn(),
      startEditing: jest.fn(),
      stopEditing: jest.fn(),
      markFrozen: jest.fn(),
      ...over,
    });

    it("shows the frozen banner and no edit controls for an author", () => {
      mockUseEditingLock.mockReturnValue(lockState());

      render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

      expect(screen.getByRole("status")).toHaveTextContent(
        "In review. Editing is paused until the reviewer sends it back.",
      );
      expect(screen.queryByLabelText("Edit lesson title")).toBeNull();
      expect(screen.queryByRole("button", { name: "Change URL" })).toBeNull();
      expect(screen.queryByTestId("delete-lesson-button")).toBeNull();
      expect(screen.queryByText("Classic")).toBeNull();
      expect(screen.queryByText("BlockNote")).toBeNull();
    });

    it("hides AddLessonBlock and inerts the classic blocks when frozen", () => {
      mockUseEditingLock.mockReturnValue(lockState());

      render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

      const list = screen.getByTestId("draggable-block-list");
      expect(list.parentElement).toHaveAttribute("inert");
      expect(screen.queryByText("Text")).toBeNull();
    });

    it("sets inert on the classic blocks as a DOM attribute only while read-only", () => {
      mockUseEditingLock.mockReturnValue(lockState());
      const { rerender } = render(
        <LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />,
      );
      const list = screen.getByTestId("draggable-block-list");
      expect(list.parentElement?.hasAttribute("inert")).toBe(true);

      mockUseEditingLock.mockReturnValue(
        lockState({ inReview: false, isOwnLock: true }),
      );
      rerender(
        <LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />,
      );
      expect(
        screen
          .getByTestId("draggable-block-list")
          .parentElement?.hasAttribute("inert"),
      ).toBe(false);
    });

    it("makes the BlockNote editor non-editable when frozen", () => {
      mockUseEditingLock.mockReturnValue(lockState());

      render(
        <LessonRenderer
          lesson={{ ...mockLesson, blocksVersion: "v2", blocksV2: [] } as never}
          dropletSlug="test-droplet"
        />,
      );

      expect(screen.getByTestId("blocknote-editor")).toHaveAttribute(
        "data-editable",
        "false",
      );
    });

    it("lets a reviewer start editing", async () => {
      const startEditing = jest.fn();
      mockUseEditingLock.mockReturnValue(
        lockState({ isReviewer: true, startEditing }),
      );

      render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

      expect(screen.getByRole("status")).toHaveTextContent(
        "In review. This lesson is read-only while you review it.",
      );
      await userEvent.click(screen.getByRole("button", { name: "Edit" }));
      expect(startEditing).toHaveBeenCalled();
    });

    it("lets a reviewer stop editing and hides the frozen banner", async () => {
      const stopEditing = jest.fn();
      mockUseEditingLock.mockReturnValue(
        lockState({ isReviewer: true, isOwnLock: true, stopEditing }),
      );

      render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

      expect(
        screen.queryByText(/Editing is paused until the reviewer/),
      ).toBeNull();
      expect(screen.getByRole("button", { name: "Change URL" })).toBeVisible();
      await userEvent.click(
        screen.getByRole("button", { name: "Stop editing" }),
      );
      expect(stopEditing).toHaveBeenCalled();
    });

    it("offers Reload when the review ended", () => {
      mockUseEditingLock.mockReturnValue(
        lockState({ inReview: false, reviewEnded: true }),
      );

      render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

      expect(screen.getByRole("status")).toHaveTextContent(
        "The review is over. Reload to edit the latest version.",
      );
      expect(screen.getByRole("button", { name: "Reload" })).toBeVisible();
      expect(screen.queryByRole("button", { name: "Change URL" })).toBeNull();
    });

    describe("pending saves", () => {
      beforeEach(() => jest.useFakeTimers());
      afterEach(() => jest.useRealTimers());

      it("drops pending saves, without flushing them, when the poll freezes the tab", () => {
        mockUseEditingLock.mockReturnValue(
          lockState({ inReview: false, isOwnLock: true }),
        );
        const { rerender } = render(
          <LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />,
        );
        // The mount autosave is pending (debounced); the tab then freezes.
        mockUseEditingLock.mockReturnValue(lockState());
        rerender(
          <LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />,
        );

        jest.advanceTimersByTime(10_000);

        expect(updateLesson).not.toHaveBeenCalled();
      });

      it("drops pending saves when the review ends", () => {
        mockUseEditingLock.mockReturnValue(
          lockState({ inReview: true, isReviewer: true, isOwnLock: true }),
        );
        const { rerender } = render(
          <LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />,
        );
        mockUseEditingLock.mockReturnValue(
          lockState({ inReview: false, reviewEnded: true }),
        );
        rerender(
          <LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />,
        );

        jest.advanceTimersByTime(10_000);

        expect(updateLesson).not.toHaveBeenCalled();
      });

      it("flushes pending saves, then releases the lock, on Stop editing", async () => {
        const stopEditing = jest.fn();
        mockUseEditingLock.mockReturnValue(
          lockState({
            inReview: true,
            isReviewer: true,
            isOwnLock: true,
            stopEditing,
          }),
        );
        render(
          <LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />,
        );
        expect(updateLesson).not.toHaveBeenCalled();

        await act(async () => {
          fireEvent.click(screen.getByRole("button", { name: "Stop editing" }));
        });

        expect(updateLesson).toHaveBeenCalledTimes(1);
        expect(stopEditing).toHaveBeenCalledTimes(1);
        expect(
          (updateLesson as jest.Mock).mock.invocationCallOrder[0],
        ).toBeLessThan(stopEditing.mock.invocationCallOrder[0]);
      });
    });

    it("shows one info toast, no error toast, and freezes on an in_review result", async () => {
      const markFrozen = jest.fn();
      mockUseEditingLock.mockReturnValue(
        lockState({ inReview: false, isOwnLock: true, markFrozen }),
      );
      (updateLesson as jest.Mock).mockResolvedValue({
        ok: false,
        error: "in_review",
        data: null,
      });

      render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

      // Flush this editor's debounced autosave (the Preview button does the same).
      window.dispatchEvent(new CustomEvent("flush-save-request"));
      await waitFor(() => expect(markFrozen).toHaveBeenCalled());
      expect(toast.info).toHaveBeenCalled();
      // Every call carries the same id, so Sonner shows a single toast.
      for (const call of (toast.info as jest.Mock).mock.calls) {
        expect(call).toEqual([
          "This droplet is in review, so your last change wasn't saved.",
          { id: "review-frozen" },
        ]);
      }
      expect(toast.error).not.toHaveBeenCalled();
      expect(markFrozen).toHaveBeenCalled();
    });

    it("does not show the slug-exists toast when Change URL is refused for review", async () => {
      mockUseEditingLock.mockReturnValue(
        lockState({ inReview: false, isOwnLock: true }),
      );
      (updateLesson as jest.Mock).mockResolvedValue({
        ok: false,
        error: "in_review",
        data: null,
      });

      render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);
      fireEvent.click(screen.getByRole("button", { name: "Change URL" }));
      fireEvent.change(screen.getByPlaceholderText("e.g., my-new-url-slug"), {
        target: { value: "new-slug" },
      });
      fireEvent.click(screen.getByText("Confirm"));

      await waitFor(() => expect(toast.info).toHaveBeenCalled());
      expect(toast.error).not.toHaveBeenCalled();
    });

    describe("editor toggle", () => {
      const emptyLesson = { ...mockLesson, blocks: [] };

      beforeEach(() => {
        mockUseEditingLock.mockReturnValue(
          lockState({ inReview: false, isOwnLock: true }),
        );
      });

      it("switches the editor when the save succeeds", async () => {
        render(
          <LessonRenderer lesson={emptyLesson} dropletSlug="test-droplet" />,
        );
        // An empty lesson starts on BlockNote.
        await waitFor(() =>
          expect(screen.getByTestId("blocknote-editor")).toBeInTheDocument(),
        );
        (updateLesson as jest.Mock).mockClear();

        fireEvent.click(screen.getByRole("button", { name: "Classic" }));

        await waitFor(() =>
          expect(
            screen.getByTestId("draggable-block-list"),
          ).toBeInTheDocument(),
        );
        expect(updateLesson).toHaveBeenCalledWith(1, {
          blocksVersion: "v1",
          blocksV2: null,
        });
      });

      it("stays put and shows the info toast when the save is refused for review", async () => {
        const markFrozen = jest.fn();
        mockUseEditingLock.mockReturnValue(
          lockState({ inReview: false, isOwnLock: true, markFrozen }),
        );
        render(
          <LessonRenderer lesson={emptyLesson} dropletSlug="test-droplet" />,
        );
        await waitFor(() =>
          expect(screen.getByTestId("blocknote-editor")).toBeInTheDocument(),
        );
        (updateLesson as jest.Mock).mockResolvedValue({
          ok: false,
          error: "in_review",
          data: null,
        });

        fireEvent.click(screen.getByRole("button", { name: "Classic" }));

        await waitFor(() => expect(markFrozen).toHaveBeenCalled());
        expect(toast.info).toHaveBeenCalled();
        expect(toast.error).not.toHaveBeenCalled();
        expect(screen.getByTestId("blocknote-editor")).toBeInTheDocument();
        expect(screen.queryByTestId("draggable-block-list")).toBeNull();
      });

      it("stays put when the save fails for another reason", async () => {
        render(
          <LessonRenderer lesson={emptyLesson} dropletSlug="test-droplet" />,
        );
        await waitFor(() =>
          expect(screen.getByTestId("blocknote-editor")).toBeInTheDocument(),
        );
        (updateLesson as jest.Mock).mockResolvedValue({
          ok: false,
          error: "boom",
          data: null,
        });

        fireEvent.click(screen.getByRole("button", { name: "Classic" }));

        await waitFor(() => expect(toast.error).toHaveBeenCalled());
        expect(screen.getByTestId("blocknote-editor")).toBeInTheDocument();
      });
    });

    describe("read-only mounts", () => {
      // The v1 autosave is debounced by 1.5 s, so a synchronous assertion
      // would pass even without the guard. Advance past the debounce.
      beforeEach(() => jest.useFakeTimers());
      afterEach(() => jest.useRealTimers());

      it("makes no updateLesson call for a read-only v1 lesson", () => {
        mockUseEditingLock.mockReturnValue(lockState());

        const { unmount } = render(
          <LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />,
        );
        act(() => {
          jest.advanceTimersByTime(5_000);
        });
        unmount();

        expect(updateLesson).not.toHaveBeenCalled();
      });

      it("makes no updateLesson call for a read-only empty lesson", () => {
        mockUseEditingLock.mockReturnValue(lockState());

        const { unmount } = render(
          <LessonRenderer
            lesson={{ ...mockLesson, blocks: [] }}
            dropletSlug="test-droplet"
          />,
        );
        act(() => {
          jest.advanceTimersByTime(5_000);
        });
        unmount();

        expect(updateLesson).not.toHaveBeenCalled();
      });

      it("does autosave a v1 lesson that is editable (control)", () => {
        mockUseEditingLock.mockReturnValue(
          lockState({ inReview: false, isOwnLock: true }),
        );

        render(
          <LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />,
        );
        act(() => {
          jest.advanceTimersByTime(5_000);
        });

        expect(updateLesson).toHaveBeenCalled();
      });
    });
  });
  describe("Lock takeover (ODY-811)", () => {
    const OLD_V2 = [{ type: "paragraph", content: "old copy" }];
    const NEW_V2 = [{ type: "paragraph", content: "A's newer edit" }];
    const v2Lesson = {
      ...mockLesson,
      blocks: [],
      blocksV2: OLD_V2 as never,
      blocksVersion: "v2" as const,
    };
    const lockState = (over: Record<string, unknown> = {}) => ({
      isLocked: true,
      isOwnLock: false,
      lockedBy: null,
      isLoading: false,
      error: null,
      inReview: false,
      isReviewer: false,
      reviewEnded: false,
      isRefreshing: false,
      tookOver: false,
      tookOverFrom: null,
      release: jest.fn(),
      startEditing: jest.fn(),
      stopEditing: jest.fn(),
      markFrozen: jest.fn(),
      ...over,
    });
    const fresh = (over: Record<string, unknown> = {}) => ({
      ok: true,
      error: null,
      data: {
        name: "Fresh name",
        blocks: [],
        blocksV2: NEW_V2,
        blocksVersion: "v2",
        ...over,
      },
    });
    /** The refresh callback the renderer handed to the hook. */
    const refreshFn = () =>
      mockUseEditingLock.mock.calls[0][1] as () => Promise<boolean>;
    const editor = () => screen.getByTestId("blocknote-editor");

    it("shows the fresh content, still read-only, before the tab becomes editable", async () => {
      (getLatestLessonContent as jest.Mock).mockResolvedValue(fresh());
      mockUseEditingLock.mockReturnValue(lockState({ isRefreshing: true }));
      const { rerender } = render(
        <LessonRenderer lesson={v2Lesson} dropletSlug="test-droplet" />,
      );
      expect(editor()).toHaveAttribute("data-content", JSON.stringify(OLD_V2));

      let ok: boolean | undefined;
      await act(async () => {
        ok = await refreshFn()();
      });

      expect(ok).toBe(true);
      expect(getLatestLessonContent).toHaveBeenCalledWith(1);
      expect(editor()).toHaveAttribute("data-content", JSON.stringify(NEW_V2));
      expect(editor()).toHaveAttribute("data-editable", "false");
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
        "Fresh name",
      );

      mockUseEditingLock.mockReturnValue(
        lockState({ isOwnLock: true, tookOver: true }),
      );
      rerender(<LessonRenderer lesson={v2Lesson} dropletSlug="test-droplet" />);

      expect(editor()).toHaveAttribute("data-editable", "true");
      expect(editor()).toHaveAttribute("data-content", JSON.stringify(NEW_V2));
    });

    it("returns false and keeps the old content when the read fails", async () => {
      (getLatestLessonContent as jest.Mock).mockResolvedValue({
        ok: false,
        error: "forbidden",
        data: null,
      });
      mockUseEditingLock.mockReturnValue(lockState({ isRefreshing: true }));
      render(<LessonRenderer lesson={v2Lesson} dropletSlug="test-droplet" />);

      let ok: boolean | undefined;
      await act(async () => {
        ok = await refreshFn()();
      });

      expect(ok).toBe(false);
      expect(editor()).toHaveAttribute("data-content", JSON.stringify(OLD_V2));
    });

    it("returns false when the read throws", async () => {
      (getLatestLessonContent as jest.Mock).mockRejectedValue(new Error("x"));
      mockUseEditingLock.mockReturnValue(lockState({ isRefreshing: true }));
      render(<LessonRenderer lesson={v2Lesson} dropletSlug="test-droplet" />);

      await expect(refreshFn()()).rejects.toThrow("x");
    });

    describe("saves during the swap", () => {
      beforeEach(() => jest.useFakeTimers());
      afterEach(() => jest.useRealTimers());

      it("never sends the stale classic blocks, and sends nothing for v2", async () => {
        const freshBlocks = [
          { __component: "droplets.generic", content: "newer text" },
        ];
        (getLatestLessonContent as jest.Mock).mockResolvedValue(
          fresh({ blocks: freshBlocks, blocksV2: null, blocksVersion: "v1" }),
        );
        // Editable on the old copy: its mount autosave is still pending.
        mockUseEditingLock.mockReturnValue(lockState({ isOwnLock: true }));
        render(
          <LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />,
        );

        await act(async () => {
          await refreshFn()();
        });
        act(() => {
          jest.advanceTimersByTime(10_000);
        });

        const sent = (updateLesson as jest.Mock).mock.calls;
        for (const [, data] of sent) {
          expect(JSON.stringify(data)).not.toContain("Generic content");
        }
        expect(sent.some(([, d]) => "blocksV2" in d)).toBe(false);
      });

      it("makes no updateLesson call when a v2 lesson is refreshed and becomes editable", async () => {
        (getLatestLessonContent as jest.Mock).mockResolvedValue(fresh());
        mockUseEditingLock.mockReturnValue(lockState({ isRefreshing: true }));
        const { rerender } = render(
          <LessonRenderer lesson={v2Lesson} dropletSlug="test-droplet" />,
        );
        await act(async () => {
          await refreshFn()();
        });
        mockUseEditingLock.mockReturnValue(
          lockState({ isOwnLock: true, tookOver: true }),
        );
        rerender(
          <LessonRenderer lesson={v2Lesson} dropletSlug="test-droplet" />,
        );
        act(() => {
          jest.advanceTimersByTime(10_000);
        });

        expect(updateLesson).not.toHaveBeenCalled();
      });
    });

    it("tells the user who finished editing", () => {
      mockUseEditingLock.mockReturnValue(
        lockState({
          isOwnLock: true,
          tookOver: true,
          tookOverFrom: { id: 9, firstName: "Ada", lastName: "Lovelace" },
        }),
      );
      render(<LessonRenderer lesson={v2Lesson} dropletSlug="test-droplet" />);

      expect(screen.getByRole("status")).toHaveTextContent(
        "Ada Lovelace finished editing. You're now editing the latest version.",
      );
    });

    it("uses the plain notice when the previous holder is unknown", () => {
      mockUseEditingLock.mockReturnValue(
        lockState({ isOwnLock: true, tookOver: true }),
      );
      render(<LessonRenderer lesson={v2Lesson} dropletSlug="test-droplet" />);

      expect(screen.getByRole("status")).toHaveTextContent(
        "You're now editing the latest version.",
      );
    });

    it("shows no notice for the first lock on load", () => {
      mockUseEditingLock.mockReturnValue(lockState({ isOwnLock: true }));
      render(<LessonRenderer lesson={v2Lesson} dropletSlug="test-droplet" />);

      expect(screen.queryByRole("status")).toBeNull();
    });
  });
});
