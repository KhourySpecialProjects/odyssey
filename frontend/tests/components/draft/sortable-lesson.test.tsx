import { render, screen, fireEvent } from "@testing-library/react";
import { SortableLesson } from "@/components/draft/sortable-lesson";
import { useRouter } from "next/navigation";

jest.mock("@dnd-kit/sortable", () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
}));

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

describe("SortableLesson", () => {
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
        __component: "droplets.expandable" as const,
        title: "Expandable title",
        content: "Expandable content",
      },
      {
        id: 3,
        __component: "droplets.video" as const,
        url: "https://example.com/video",
      },
      {
        id: 4,
        __component: "droplets.callout" as const,
        content: [
          {
            type: "paragraph",
            children: [{ type: "text", text: "Callout content" }],
          },
        ],
        type: "info",
        color: "bg-sky-50",
      },
      {
        id: 5,
        __component: "droplets.quiz" as const,
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
        __component: "droplets.open-ended-quiz" as const,
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

  const mockDroplet = {
    id: 1,
    name: "Test Droplet",
    slug: "test-droplet",
    lessons: [],
  };

  const mockRouter = {
    push: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  it("renders lesson name and correct icon based on type", () => {
    render(
      <SortableLesson
        lesson={mockLesson}
        droplet={mockDroplet}
        pathname="/test"
      />,
    );
    expect(screen.getByText(mockLesson.name)).toBeInTheDocument();
  });

  it("applies active styling when pathname matches", () => {
    render(
      <SortableLesson
        lesson={mockLesson}
        droplet={mockDroplet}
        pathname={`/draft/d/test-droplet/test-lesson`}
      />,
    );
    // Active state applies bg-[#2D7597] to the inner div, not the link itself
    const { container } = render(
      <SortableLesson
        lesson={mockLesson}
        droplet={mockDroplet}
        pathname={`/draft/d/test-droplet/test-lesson`}
      />,
    );
    const activeDiv = container.querySelector(".bg-\\[\\#2D7597\\]");
    expect(activeDiv).toBeInTheDocument();
  });

  it("navigates to correct path when clicked", () => {
    const mockPush = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });

    render(
      <SortableLesson
        lesson={mockLesson}
        droplet={mockDroplet}
        pathname="/test"
      />,
    );

    fireEvent.click(screen.getByRole("link"));
    expect(mockPush).toHaveBeenCalledWith("/draft/d/test-droplet/test-lesson");
  });

  it("prevents default and navigates on lesson click", () => {
    render(
      <SortableLesson
        lesson={mockLesson}
        droplet={mockDroplet}
        pathname="/test"
      />,
    );

    const link = screen.getByRole("link");
    fireEvent.click(link);

    expect(mockRouter.push).toHaveBeenCalledWith(
      `/draft/d/${mockDroplet.slug}/${mockLesson.slug}`,
    );
  });

  it("does not apply active styling when pathname does not match", () => {
    const { container } = render(
      <SortableLesson
        lesson={mockLesson}
        droplet={mockDroplet}
        pathname="/some/other/path"
      />,
    );

    const activeDiv = container.querySelector(".bg-\\[\\#2D7597\\]");
    expect(activeDiv).not.toBeInTheDocument();
  });

  it("should handle lesson click", () => {
    render(
      <SortableLesson
        lesson={mockLesson}
        droplet={mockDroplet}
        pathname="/some/path"
      />,
    );

    const lessonLink = screen.getByRole("link");
    fireEvent.click(lessonLink);

    expect(mockRouter.push).toHaveBeenCalledWith(
      "/draft/d/test-droplet/test-lesson",
    );
  });

  it("should apply active background styling when pathname matches", () => {
    const activePath = "/draft/d/test-droplet/test-lesson";

    const { container } = render(
      <SortableLesson
        lesson={mockLesson}
        droplet={mockDroplet}
        pathname={activePath}
      />,
    );

    const activeDiv = container.querySelector(".bg-\\[\\#2D7597\\]");
    expect(activeDiv).toBeInTheDocument();
  });
});
