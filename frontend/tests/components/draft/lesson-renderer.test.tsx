import {
  render,
  screen,
  fireEvent,
  act,
  waitFor,
} from "@testing-library/react";
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
          <button onClick={() => deleteBlock(index)()}>
            Delete Block {index}
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
  };

  const mockLesson = {
    id: 1,
    name: "Test Lesson",
    slug: "test-lesson",
    droplet_lessons: [],
    droplets: [],
    notes: [],
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
  });

  describe("Buttons and Actions", () => {
    it("renders Change URL button with correct styling", () => {
      render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

      const changeUrlButton = screen.getByText("Change URL");
      expect(changeUrlButton).toBeInTheDocument();
    });

    it("renders popup with correct structure", () => {
      render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

      fireEvent.click(screen.getByText("Change URL"));

      expect(screen.getByText("Enter New URL Slug")).toBeInTheDocument();
      expect(screen.getByText("Cancel")).toBeInTheDocument();
      expect(screen.getByText("Confirm")).toBeInTheDocument();
    });

    it("popup has correct styling classes", () => {
      const { container } = render(
        <LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />,
      );

      fireEvent.click(screen.getByText("Change URL"));

      const popup = container.querySelector(".fixed.inset-0");
      expect(popup).toHaveClass("bg-black");
      expect(popup).toHaveClass("bg-opacity-50");
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
    });
  });
});
