import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LessonRenderer } from "@/components/draft/lesson/lesson-renderer";
import { useRouter } from "next/navigation";
import { updateLesson, deleteLesson } from "@/lib/requests/lesson";
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

jest.mock("@/components/draft/lesson/draggable_block_list", () => ({
  __esModule: true,
  default: ({ blocks, deleteBlock, onReorder, onAddBlock, setBlock }: any) => (
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
            onClick={() =>
              onAddBlock(index, {
                __component: "droplets.generic",
                content: "New block",
              })
            }
            data-testid={`add-block-${index}`}
          >
            Add Block
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

jest.mock("react-dnd", () => ({
  DndProvider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

jest.mock("react-dnd-html5-backend", () => ({
  HTML5Backend: "HTML5Backend",
}));

jest.mock("@/lib/requests/lesson", () => ({
  updateLesson: jest.fn(),
  deleteLesson: jest.fn(),
}));

jest.mock("@/lib/requests/droplet", () => ({
  getDropletBySlug: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
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
    droplets: [],
    notes: [],
    orderIndex: 1,
    blocks: [
      {
        id: 1,
        __component: "droplets.generic",
        content: "Generic content",
      },
      {
        id: 2,
        __component: "droplets.video",
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
    it("renders lesson name input", () => {
      render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

      expect(screen.getByTestId("lesson-name-input")).toBeInTheDocument();
    });

    it("renders all blocks", () => {
      render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

      expect(screen.getByTestId("block-droplets.generic")).toBeInTheDocument();
      expect(screen.getByTestId("block-droplets.video")).toBeInTheDocument();
    });

    it("renders Change URL button", () => {
      render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

      expect(screen.getByText("Change URL")).toBeInTheDocument();
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

      const nameInput = screen.getByTestId(
        "lesson-name-field",
      ) as HTMLInputElement;
      expect(nameInput.defaultValue).toContain("Test Lesson");
    });
  });

  describe("Lesson Name Updates", () => {
    it("updates lesson name on input change", async () => {
      render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

      const nameField = screen.getByTestId("lesson-name-field");
      fireEvent.change(nameField, { target: { value: "Updated Lesson Name" } });
    });

    it("navigates to new slug after name update", async () => {
      (updateLesson as jest.Mock).mockResolvedValue({
        ok: true,
        data: { attributes: { slug: "updated-lesson-name" } },
      });

      render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

      const nameField = screen.getByTestId("lesson-name-field");
      fireEvent.change(nameField, { target: { value: "Updated Lesson Name" } });
    });

    it("handles name update errors gracefully", async () => {
      (updateLesson as jest.Mock).mockResolvedValue({
        error: "Update failed",
      });

      render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

      const nameField = screen.getByTestId("lesson-name-field");
      fireEvent.change(nameField, { target: { value: "New Name" } });

      expect(mockRouter.replace).not.toHaveBeenCalled();
    });
  });

  describe("URL Slug Change", () => {
    it("opens slug change popup when Change URL is clicked", () => {
      render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

      fireEvent.click(screen.getByText("Change URL"));

      expect(screen.getByText("Enter New URL Slug")).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("e.g., my-new-url-slug"),
      ).toBeInTheDocument();
    });

    it("closes popup when Cancel is clicked", () => {
      render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

      fireEvent.click(screen.getByText("Change URL"));
      fireEvent.click(screen.getByText("Cancel"));

      expect(screen.queryByText("Enter New URL Slug")).not.toBeInTheDocument();
    });

    it("updates slug input value", () => {
      render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

      fireEvent.click(screen.getByText("Change URL"));

      const slugInput = screen.getByPlaceholderText(
        "e.g., my-new-url-slug",
      ) as HTMLInputElement;
      fireEvent.change(slugInput, { target: { value: "new-slug" } });

      expect(slugInput.value).toBe("new-slug");
    });

    it("does not call update with empty slug", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

      fireEvent.click(screen.getByText("Change URL"));
      fireEvent.click(screen.getByText("Confirm"));

      expect(updateLesson).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith("New slug cannot be empty");

      consoleErrorSpy.mockRestore();
    });

    it("does not call update with whitespace-only slug", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

      fireEvent.click(screen.getByText("Change URL"));

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

      fireEvent.click(screen.getByText("Change URL"));

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

      fireEvent.click(screen.getByText("Change URL"));

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

      fireEvent.click(screen.getByText("Change URL"));

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

      fireEvent.click(screen.getByText("Change URL"));

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
          { __component: "droplets.generic", id: 1, content: "" },
          { __component: "droplets.video", id: 2, url: "" },
          { __component: "droplets.expandable", id: 3, title: "", content: "" },
          { __component: "droplets.callout", id: 4, content: "", color: "" },
          { __component: "droplets.quiz", id: 5, questions: [] },
          { __component: "droplets.open-ended-quiz", id: 6, questions: [] },
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

      expect(screen.getByTestId("lesson-name-input")).toBeInTheDocument();
      expect(screen.getByTestId("draggable-block-list")).toBeInTheDocument();
    });

    it("handles lesson with single block", () => {
      const singleBlockLesson = {
        ...mockLesson,
        blocks: [
          { __component: "droplets.generic", id: 1, content: "Content" },
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
      (updateLesson as jest.Mock).mockResolvedValue({ ok: true });

      render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

      const deleteButton = screen.getByTestId("delete-block-0");
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(updateLesson).toHaveBeenCalled();
      });
    });

    it("adds block at specific index", async () => {
      render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

      const addButton = screen.getByTestId("add-block-0");
      fireEvent.click(addButton);

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
        expect(getDropletBySlug).toHaveBeenCalledWith("test-droplet");
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
      (deleteLesson as jest.Mock).mockResolvedValue({ error: "Delete failed" });

      render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

      const deleteButton = screen.getByTestId("delete-lesson-button");
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(deleteLesson).toHaveBeenCalled();
      });

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
            __component: "droplets.callout",
            id: 3,
            content: "New content",
            color: "blue",
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

      expect(screen.getByTestId("lesson-name-input")).toBeInTheDocument();
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

      expect(screen.getByTestId("lesson-name-input")).toBeInTheDocument();
    });

    it("handles blocks without id", () => {
      const blocksWithoutId = {
        ...mockLesson,
        blocks: [{ __component: "droplets.generic", content: "No ID" }],
      };

      render(
        <LessonRenderer lesson={blocksWithoutId} dropletSlug="test-droplet" />,
      );

      expect(screen.getByTestId("block-droplets.generic")).toBeInTheDocument();
    });

    it("handles empty dropletSlug", async () => {
      render(<LessonRenderer lesson={mockLesson} dropletSlug="" />);

      expect(screen.getByTestId("lesson-name-input")).toBeInTheDocument();
    });
  });

  describe("Styling", () => {
    it("applies correct classes to lesson name input", () => {
      render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

      const nameInput = screen.getByTestId("lesson-name-input");
      expect(nameInput).toHaveClass("mb-3");
      expect(nameInput).toHaveClass("w-[700px]");
      expect(nameInput).toHaveClass("max-w-2xl");
      expect(nameInput).toHaveClass("text-center");
    });

    it("confirm button has correct styling", () => {
      render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

      fireEvent.click(screen.getByText("Change URL"));

      const confirmButton = screen.getByText("Confirm");
      expect(confirmButton).toHaveClass("bg-sky-600");
      expect(confirmButton).toHaveClass("text-white");
      expect(confirmButton).toHaveClass("hover:bg-sky-700");
    });

    it("popup has correct styling classes", () => {
      const { container } = render(
        <LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />,
      );

      fireEvent.click(screen.getByText("Change URL"));

      const popup = container.querySelector(".fixed.inset-0");
      expect(popup).toHaveClass("bg-black");
      expect(popup).toHaveClass("bg-opacity-50");
      expect(popup).toHaveClass("z-50");
    });

    it("applies dark mode classes to popup", () => {
      render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

      fireEvent.click(screen.getByText("Change URL"));

      const popupContent = screen.getByText("Enter New URL Slug").parentElement;
      expect(popupContent).toHaveClass("dark:bg-slate-900");
    });
  });

  describe("Accessibility", () => {
    it("popup input has placeholder", () => {
      render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

      fireEvent.click(screen.getByText("Change URL"));

      const input = screen.getByPlaceholderText("e.g., my-new-url-slug");
      expect(input).toBeInTheDocument();
    });

    it("buttons have descriptive text", () => {
      render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

      expect(screen.getByText("Change URL")).toBeInTheDocument();
      expect(screen.getByTestId("delete-lesson-button")).toBeInTheDocument();
    });

    it("popup has heading", () => {
      render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

      fireEvent.click(screen.getByText("Change URL"));

      expect(screen.getByText("Enter New URL Slug")).toBeInTheDocument();
    });
  });
});
