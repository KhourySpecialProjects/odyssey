import { render, screen, fireEvent, act } from "@testing-library/react";
import { LessonRenderer } from "@/components/draft/lesson/lesson-renderer";
import { deleteLesson, updateLesson } from "@/lib/actions";
import { useRouter } from "next/navigation";

jest.mock("@/components/ui/tiptap/lesson-name-input", () => ({
  LessonNameInput: ({ initialContent, updateContent }: any) => (
    <div data-testid="lesson-name-input">
      <input
        type="text"
        defaultValue={initialContent}
        onChange={(e) => updateContent(e.target.value)}
      />
    </div>
  ),
}));

// Add this mock at the top with your other mocks
jest.mock("@/components/draft/lesson/draggable_block_list", () => ({
  __esModule: true,
  default: ({ blocks, setBlock, deleteBlock }: any) => (
    <div data-testid="draggable-block-list">
      {blocks.map((block: any, index: number) => (
        <div key={block.id}>
          {block.__component === "droplets.video" && (
            <div data-testid="video-editor">
              Mock Video Editor
              <button onClick={() => deleteBlock(index)()}>Delete</button>
            </div>
          )}
          {block.__component === "droplets.generic" && (
            <div data-testid="generic-editor">
              Mock Generic Editor
              <button onClick={() => deleteBlock(index)()}>Delete</button>
            </div>
          )}
          {block.__component === "droplets.expandable" && (
            <div data-testid="expandable-editor">
              Mock Expandable Editor
              <button onClick={() => deleteBlock(index)()}>Delete</button>
            </div>
          )}
          {block.__component === "droplets.callout" && (
            <div data-testid="callout-editor">
              Mock Callout Editor
              <button onClick={() => deleteBlock(index)()}>Delete</button>
            </div>
          )}
          {block.__component === "droplets.quiz" && (
            <div data-testid="quiz-editor">
              Mock Quiz Editor
              <button onClick={() => deleteBlock(index)()}>Delete</button>
            </div>
          )}
          {block.__component === "droplets.open-ended-quiz" && (
            <div data-testid="open-ended-quiz-editor">
              Mock Open Ended Quiz Editor
              <button onClick={() => deleteBlock(index)()}>Delete</button>
            </div>
          )}
        </div>
      ))}
    </div>
  ),
}));

jest.mock("react-dnd", () => ({
  useDrag: () => [{ isDragging: false }, () => {}],
  useDrop: () => [{}, () => {}],
  DndProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("react-dnd-html5-backend", () => ({
  HTML5Backend: "HTML5Backend",
}));

jest.mock("@/components/draft/lesson/blocks/expandable", () => ({
  ExpandableEditor: ({ deleteBlock }: any) => (
    <div data-testid="expandable-editor">
      Mock Expandable Editor
      <button onClick={deleteBlock}>Delete</button>
    </div>
  ),
}));

jest.mock("@/components/draft/lesson/blocks/video", () => ({
  VideoEditor: ({ deleteBlock }: any) => (
    <div data-testid="video-editor">
      Mock Video Editor
      <button onClick={deleteBlock}>Delete</button>
    </div>
  ),
}));

jest.mock("@/components/draft/lesson/blocks/generic", () => ({
  GenericEditor: ({ deleteBlock }: any) => (
    <div data-testid="generic-editor">
      Mock Generic Editor
      <button onClick={deleteBlock}>Delete</button>
    </div>
  ),
}));

jest.mock("@/components/draft/lesson/blocks/callout", () => ({
  CalloutEditor: ({ deleteBlock }: any) => (
    <div data-testid="callout-editor">
      Mock Callout Editor
      <button onClick={deleteBlock}>Delete</button>
    </div>
  ),
}));

jest.mock("@/components/draft/lesson/blocks/quiz", () => ({
  QuizEditor: ({ deleteBlock }: any) => (
    <div data-testid="quiz-editor">
      Mock Quiz Editor
      <button onClick={deleteBlock}>Delete</button>
    </div>
  ),
}));

jest.mock("@/components/draft/lesson/blocks/open-ended-quiz", () => ({
  OpenEndedQuizEditor: ({ deleteBlock }: any) => (
    <div data-testid="open-ended-quiz-editor">
      Mock Open Ended Quiz Editor
      <button onClick={deleteBlock}>Delete</button>
    </div>
  ),
}));

jest.mock("@/components/draft/lesson/blocks/generic", () => ({
  GenericEditor: () => (
    <div data-testid="generic-editor">Mock Generic Editor</div>
  ),
}));

jest.mock("@/lib/actions", () => ({
  updateLesson: jest.fn(),
  deleteLesson: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

jest.mock("lodash", () => ({
  debounce: (fn: Function) => fn,
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
        __component: "droplets.expandable",
        title: "Expandable title",
        content: "Expandable content",
      },
      {
        id: 3,
        __component: "droplets.video",
        url: "https://example.com/video",
      },
      {
        id: 4,
        __component: "droplets.callout",
        content: "Callout content",
        type: "info",
        color: "bg-sky-50",
      },
      {
        id: 5,
        __component: "droplets.quiz",
        questions: [
          {
            id: 1,
            content: "Quiz question",
            answerOptions: [
              { id: 1, content: "Option 1", isCorrect: true },
              { id: 2, content: "Option 2", isCorrect: false },
            ],
          },
        ],
      },
      {
        id: 6,
        __component: "droplets.open-ended-quiz",
        questions: [
          {
            id: 1,
            content: "Open ended question",
            correctAnswer: "Correct answer",
          },
        ],
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  it("regenerates slug when requested", async () => {
    (updateLesson as jest.Mock).mockResolvedValueOnce({
      data: { attributes: { slug: "new-slug" } },
    });

    render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

    const regenerateButton = screen.getByText("Regenerate URL Slug");
    fireEvent.click(regenerateButton);

    expect(updateLesson).toHaveBeenCalledWith(
      mockLesson.id,
      { name: mockLesson.name },
      { regenerateSlug: true },
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockRouter.replace).toHaveBeenCalledWith(
      "/draft/d/test-droplet/new-slug",
    );
  });

  it("renders different block types correctly", () => {
    const mockLessonWithAllBlocks = {
      ...mockLesson,
      blocks: [
        { __component: "droplets.video", id: 1 },
        { __component: "droplets.generic", id: 2 },
        { __component: "droplets.expandable", id: 3 },
        { __component: "droplets.callout", id: 4 },
        { __component: "droplets.quiz", questions: [], id: 5 },
        { __component: "droplets.open-ended-quiz", questions: [], id: 6 },
      ],
    };

    render(
      <LessonRenderer
        lesson={mockLessonWithAllBlocks}
        dropletSlug="test-droplet"
      />,
    );

    expect(screen.getByTestId("video-editor")).toBeInTheDocument();
    expect(screen.getByTestId("generic-editor")).toBeInTheDocument();
    expect(screen.getByTestId("expandable-editor")).toBeInTheDocument();
    expect(screen.getByTestId("callout-editor")).toBeInTheDocument();
    expect(screen.getByTestId("quiz-editor")).toBeInTheDocument();
    expect(screen.getByTestId("open-ended-quiz-editor")).toBeInTheDocument();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  it("renders lesson name and blocks", () => {
    render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

    const nameInput = screen.getByTestId("lesson-name-input");
    expect(nameInput).toBeInTheDocument();
    expect(screen.getByTestId("generic-editor")).toBeInTheDocument();
  });

  it("updates lesson name with debounce", async () => {
    jest.useFakeTimers();
    (updateLesson as jest.Mock).mockResolvedValue({
      data: { attributes: { slug: "new-slug" } },
    });

    render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

    const nameInput = screen
      .getByTestId("lesson-name-input")
      .querySelector("input");
    fireEvent.change(nameInput!, { target: { value: "<h1>New Name</h1>" } });

    await act(async () => {
      jest.runAllTimers();
    });

    expect(updateLesson).toHaveBeenCalledWith(1, { name: "New Name" });
    jest.useRealTimers();
  });

  it("handles block deletion", async () => {
    (updateLesson as jest.Mock).mockResolvedValue({ ok: true });

    render(<LessonRenderer lesson={mockLesson} dropletSlug="test-droplet" />);

    const deleteButton = screen.getAllByRole("button", { name: "Delete" });
    await act(async () => {
      fireEvent.click(deleteButton[0]);
    });

    expect(updateLesson).toHaveBeenCalledWith(
      1,
      {
        blocks: [
          {
            id: 2,
            __component: "droplets.expandable",
            content: "Expandable content",
            title: "Expandable title",
          },
          {
            id: 3,
            __component: "droplets.video",
            url: "https://example.com/video",
          },
          {
            id: 4,
            __component: "droplets.callout",
            content: "Callout content",
            type: "info",
            color: "bg-sky-50",
          },
          {
            id: 5,
            __component: "droplets.quiz",
            questions: [
              {
                id: 1,
                content: "Quiz question",
                answerOptions: [
                  { id: 1, content: "Option 1", isCorrect: true },
                  { id: 2, content: "Option 2", isCorrect: false },
                ],
              },
            ],
          },
          {
            id: 6,
            __component: "droplets.open-ended-quiz",
            questions: [
              {
                id: 1,
                content: "Open ended question",
                correctAnswer: "Correct answer",
              },
            ],
          },
        ],
      },
      { reload: true },
    );
  });
});
