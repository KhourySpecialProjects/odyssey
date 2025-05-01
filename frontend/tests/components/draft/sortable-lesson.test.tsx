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
    droplets: [],
    droplet_lessons: [],
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

  const mockDroplet = {
    id: 1,
    name: "Test Droplet",
    slug: "test-droplet",
    lessons: [],
  };

  const mockClasses = {
    link: "test-link",
    activeLink: "test-active",
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
        classes={mockClasses}
      />,
    );
    expect(screen.getByText(mockLesson.name)).toBeInTheDocument();
  });

  it("applies active class when pathname matches", () => {
    render(
      <SortableLesson
        lesson={mockLesson}
        droplet={mockDroplet}
        pathname={`/draft/d/test-droplet/test-lesson`}
        classes={mockClasses}
      />,
    );
    expect(screen.getByRole("link")).toHaveClass("test-active");
  });

  it("navigates to correct path when clicked", () => {
    const mockPush = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });

    render(
      <SortableLesson
        lesson={mockLesson}
        droplet={mockDroplet}
        pathname="/test"
        classes={mockClasses}
      />,
    );

    fireEvent.click(screen.getByRole("link"));
    expect(mockPush).toHaveBeenCalledWith("/draft/d/test-droplet/test-lesson");
  });

  const mockRouter = {
    push: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  it("prevents default and navigates on lesson click", () => {
    render(
      <SortableLesson
        lesson={mockLesson}
        droplet={mockDroplet}
        pathname="/test"
        classes={mockClasses}
      />,
    );

    const link = screen.getByRole("link");
    fireEvent.click(link);

    expect(mockRouter.push).toHaveBeenCalledWith(
      `/draft/d/${mockDroplet.slug}/${mockLesson.slug}`,
    );
  });

  it("applies active class when pathname matches", () => {
    const currentPath = `/draft/d/test-droplet/test-lesson`;

    render(
      <SortableLesson
        lesson={mockLesson}
        droplet={mockDroplet}
        pathname={currentPath}
        classes={mockClasses}
      />,
    );

    const link = screen.getByRole("link");
    expect(link).toHaveClass(mockClasses.activeLink);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  it("should handle lesson click", () => {
    render(
      <SortableLesson
        lesson={mockLesson}
        droplet={mockDroplet}
        pathname="/some/path"
        classes={mockClasses}
      />,
    );

    const lessonLink = screen.getByRole("link");
    fireEvent.click(lessonLink);

    expect(mockRouter.push).toHaveBeenCalledWith(
      "/draft/d/test-droplet/test-lesson",
    );
  });

  it("should apply correct styling based on pathname", () => {
    const activePath = "/draft/d/test-droplet/test-lesson";

    render(
      <SortableLesson
        lesson={mockLesson}
        droplet={mockDroplet}
        pathname={activePath}
        classes={mockClasses}
      />,
    );

    const link = screen.getByRole("link");
    expect(link).toHaveClass("test-link", "test-active");
  });
});
