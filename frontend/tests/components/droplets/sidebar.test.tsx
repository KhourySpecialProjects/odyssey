import { render, screen, fireEvent } from "@testing-library/react";
import Sidebar from "@/components/droplets/sidebar";
import { usePathname } from "next/navigation";
import { AuthorizedUserRoleTitle } from "@/lib/globals";

jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
}));

describe("Sidebar", () => {
  const mockProps = {
    user: {
      id: 1,
      name: "Test User",
      email: "test@example.com",
      roles: [AuthorizedUserRoleTitle.User],
      isActive: true,
    },
    author: false,
    droplet: {
      name: "Test Droplet",
      slug: "test-droplet",
      droplet_lessons: [
        {
          orderIndex: 1,
          id: 1,
          lesson: {
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
          },
        },
        {
          orderIndex: 2,
          id: 2,
          lesson: {
            id: 2,
            name: "Test Lesson2",
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
          },
        },
      ],
    },
    authorizedUser: null,
    completedLessonIds: [],
  };

  beforeEach(() => {
    (usePathname as jest.Mock).mockReturnValue("/d/test-droplet");
  });

  it("renders droplet name and navigation links", () => {
    render(<Sidebar {...mockProps} />);

    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Recap")).toBeInTheDocument();
  });

  it("shows edit button for authors", () => {
    render(<Sidebar {...mockProps} author={true} />);
    expect(screen.getByText("Edit")).toBeInTheDocument();
  });

  it("shows progress percentage", () => {
    render(<Sidebar {...mockProps} />);
    expect(screen.getByText("0% complete")).toBeInTheDocument();
  });

  it("handles mobile menu toggle", () => {
    render(<Sidebar {...mockProps} />);

    const menuButton = screen.getByRole("button", { name: /open sidebar/i });
    fireEvent.click(menuButton);

    expect(screen.getByRole("complementary")).toHaveClass("translate-x-0");
  });

  beforeEach(() => {
    (usePathname as jest.Mock).mockReturnValue("/d/test-droplet");
  });

  it("calculates progress correctly", () => {
    render(
      <Sidebar
        user={mockProps.user}
        author={false}
        droplet={mockProps.droplet}
        completedLessonIds={[1]}
      />,
    );

    expect(screen.getByText("50% complete")).toBeInTheDocument();
  });

  it("shows locked state for lessons correctly", () => {
    render(
      <Sidebar
        user={mockProps.user}
        author={false}
        droplet={mockProps.droplet}
        completedLessonIds={[]}
      />,
    );

    const lesson2Link = screen.getByText("Test Lesson2").closest("a");
    expect(lesson2Link).toHaveClass("w-full flex");
  });

  it("shows completed lessons with checkmark", () => {
    render(
      <Sidebar
        user={mockProps.user}
        author={false}
        droplet={mockProps.droplet}
        completedLessonIds={[1]}
        enrollmentId="123"
      />,
    );

    expect(screen.getByTestId("check-circle-icon")).toBeInTheDocument();
  });

  it("toggles sidebar expansion on mobile", () => {
    render(
      <Sidebar
        user={mockProps.user}
        author={false}
        droplet={mockProps.droplet}
        completedLessonIds={[]}
      />,
    );

    const expandButton = screen.getByRole("button", { name: /open sidebar/i });
    fireEvent.click(expandButton);

    expect(screen.getByRole("complementary")).toHaveClass("translate-x-0");

    const overlay = screen.getByTestId("sidebar-overlay");
    fireEvent.click(overlay);

    expect(screen.getByRole("complementary")).toHaveClass("translate-x-0");
  });
});
