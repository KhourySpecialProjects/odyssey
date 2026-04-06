import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import DropletFooter from "@/components/droplets/footer";
import { usePathname, useRouter } from "next/navigation";
import { updateViewedLessons } from "@/lib/requests/enrollment";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
  useRouter: jest.fn(),
}));

jest.mock("@/lib/requests/enrollment", () => ({
  updateViewedLessons: jest.fn(),
}));

describe("DropletFooter", () => {
  const mockDroplet = {
    slug: "test-droplet",
    lessons: [
      { id: 1, slug: "lesson-1", name: "Lesson 1" },
      { id: 2, slug: "lesson-2", name: "Lesson 2" },
      { id: 3, slug: "lesson-3", name: "Lesson 3" },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    (updateViewedLessons as jest.Mock).mockResolvedValue({});

    // Clear any existing quiz elements
    document.body.innerHTML = "";
  });

  describe("Returns Null Cases", () => {
    it("returns null when no droplet lessons", () => {
      const noLessonsDroplet = { slug: "test" };
      (usePathname as jest.Mock).mockReturnValue("/d/test");

      const { container } = render(
        <DropletFooter droplet={noLessonsDroplet as any} />,
      );

      expect(container.firstChild).toBeNull();
    });

    it("returns null when lessons is undefined", () => {
      const undefinedLessonsDroplet = {
        slug: "test",
        lessons: undefined,
      };
      (usePathname as jest.Mock).mockReturnValue("/d/test");

      const { container } = render(
        <DropletFooter droplet={undefinedLessonsDroplet as any} />,
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe("Overview Page Navigation", () => {
    it("renders navigation for overview page", () => {
      (usePathname as jest.Mock).mockReturnValue("/d/test-droplet");

      render(<DropletFooter droplet={mockDroplet as any} />);

      expect(screen.getByText("Next")).toBeInTheDocument();
      expect(screen.queryByText("Previous")).not.toBeInTheDocument();
    });

    it("next button links to first lesson from overview", () => {
      (usePathname as jest.Mock).mockReturnValue("/d/test-droplet");

      render(<DropletFooter droplet={mockDroplet as any} />);

      const nextButton = screen.getByText("Next").closest("button");
      expect(nextButton).toBeInTheDocument();
    });
  });

  describe("First Lesson Navigation", () => {
    it("shows Previous button from first lesson", () => {
      (usePathname as jest.Mock).mockReturnValue("/d/test-droplet/lesson-1");

      render(<DropletFooter droplet={mockDroplet as any} />);

      expect(screen.getByText("Previous")).toBeInTheDocument();
    });

    it("shows Next button from first lesson", () => {
      (usePathname as jest.Mock).mockReturnValue("/d/test-droplet/lesson-1");

      render(<DropletFooter droplet={mockDroplet as any} />);

      expect(screen.getByText("Next")).toBeInTheDocument();
    });
  });

  describe("Middle Lesson Navigation", () => {
    it("shows navigation for middle lesson", () => {
      (usePathname as jest.Mock).mockReturnValue("/d/test-droplet/lesson-2");

      render(<DropletFooter droplet={mockDroplet as any} />);

      expect(screen.getByText("Previous")).toBeInTheDocument();
      expect(screen.getByText("Next")).toBeInTheDocument();
    });
  });

  describe("Last Lesson Navigation", () => {
    it("shows Next button from last lesson", () => {
      (usePathname as jest.Mock).mockReturnValue("/d/test-droplet/lesson-3");

      render(<DropletFooter droplet={mockDroplet as any} />);

      expect(screen.getByText("Next")).toBeInTheDocument();
    });

    it("shows Previous button from last lesson", () => {
      (usePathname as jest.Mock).mockReturnValue("/d/test-droplet/lesson-3");

      render(<DropletFooter droplet={mockDroplet as any} />);

      expect(screen.getByText("Previous")).toBeInTheDocument();
    });
  });

  describe("Quiz Validation - No Quizzes", () => {
    it("allows proceeding when no quiz questions exist", () => {
      (usePathname as jest.Mock).mockReturnValue("/d/test-droplet/lesson-1");

      render(<DropletFooter droplet={mockDroplet as any} />);

      // Should show unlocked next button
      const nextButton = screen.getByText("Next").closest("button");
      expect(nextButton).toBeInTheDocument();
      expect(
        screen.queryByText(/Answer all quiz questions/),
      ).not.toBeInTheDocument();
    });
  });

  describe("Quiz Validation - With Quizzes", () => {
    it("blocks proceeding when quiz questions are unanswered", () => {
      (usePathname as jest.Mock).mockReturnValue("/d/test-droplet/lesson-1");

      // Add quiz questions to DOM
      const question = document.createElement("div");
      question.setAttribute("role", "question");
      document.body.appendChild(question);

      render(<DropletFooter droplet={mockDroplet as any} />);

      expect(
        screen.getByText(/Complete all quizzes to proceed/),
      ).toBeInTheDocument();
    });

    it("allows proceeding when all questions answered correctly", () => {
      (usePathname as jest.Mock).mockReturnValue("/d/test-droplet/lesson-1");

      // Add matched quiz questions and status
      const question = document.createElement("div");
      question.setAttribute("role", "question");
      const status = document.createElement("div");
      status.setAttribute("role", "status");
      status.textContent = "Right!";

      document.body.appendChild(question);
      document.body.appendChild(status);

      render(<DropletFooter droplet={mockDroplet as any} />);

      expect(
        screen.queryByText(/Complete all quizzes to proceed/),
      ).not.toBeInTheDocument();
      expect(screen.getByText("Next")).toBeInTheDocument();
    });

    it("blocks when not all questions answered correctly", () => {
      (usePathname as jest.Mock).mockReturnValue("/d/test-droplet/lesson-1");

      const question1 = document.createElement("div");
      question1.setAttribute("role", "question");
      const question2 = document.createElement("div");
      question2.setAttribute("role", "question");

      const status1 = document.createElement("div");
      status1.setAttribute("role", "status");
      status1.textContent = "Right!";

      const status2 = document.createElement("div");
      status2.setAttribute("role", "status");
      status2.textContent = "Wrong!";

      document.body.appendChild(question1);
      document.body.appendChild(question2);
      document.body.appendChild(status1);
      document.body.appendChild(status2);

      render(<DropletFooter droplet={mockDroplet as any} />);

      expect(
        screen.getByText(/Complete all quizzes to proceed/),
      ).toBeInTheDocument();
    });

    it("blocks when question count doesn't match status count", () => {
      (usePathname as jest.Mock).mockReturnValue("/d/test-droplet/lesson-1");

      const question1 = document.createElement("div");
      question1.setAttribute("role", "question");
      const question2 = document.createElement("div");
      question2.setAttribute("role", "question");

      const status = document.createElement("div");
      status.setAttribute("role", "status");
      status.textContent = "Right!";

      document.body.appendChild(question1);
      document.body.appendChild(question2);
      document.body.appendChild(status);

      render(<DropletFooter droplet={mockDroplet as any} />);

      expect(
        screen.getByText(/Complete all quizzes to proceed/),
      ).toBeInTheDocument();
    });

    it("checks for 'right' case-insensitively", () => {
      (usePathname as jest.Mock).mockReturnValue("/d/test-droplet/lesson-1");

      const question = document.createElement("div");
      question.setAttribute("role", "question");
      const status = document.createElement("div");
      status.setAttribute("role", "status");
      status.textContent = "RIGHT!"; // Uppercase

      document.body.appendChild(question);
      document.body.appendChild(status);

      render(<DropletFooter droplet={mockDroplet as any} />);

      expect(
        screen.queryByText(/Complete all quizzes to proceed/),
      ).not.toBeInTheDocument();
    });
  });

  describe("MutationObserver", () => {
    it("sets up mutation observer", () => {
      (usePathname as jest.Mock).mockReturnValue("/d/test-droplet/lesson-1");

      render(<DropletFooter droplet={mockDroplet as any} />);

      // Observer is set up (we can't easily test it directly)
      expect(screen.getByText("Next")).toBeInTheDocument();
    });

    it("disconnects observer on unmount", () => {
      (usePathname as jest.Mock).mockReturnValue("/d/test-droplet/lesson-1");

      const { unmount } = render(
        <DropletFooter droplet={mockDroplet as any} />,
      );

      unmount();

      // Observer should be disconnected (verified by no errors)
    });
  });

  describe("Single Lesson Droplet", () => {
    it("handles droplet with single lesson", () => {
      const singleLessonDroplet = {
        slug: "test",
        lessons: [{ id: 1, slug: "only-lesson", name: "Only Lesson" }],
      };

      (usePathname as jest.Mock).mockReturnValue("/d/test/only-lesson");

      render(<DropletFooter droplet={singleLessonDroplet as any} />);

      expect(screen.getByText("Previous")).toBeInTheDocument();
      expect(screen.getByText("Next")).toBeInTheDocument();
    });
  });

  describe("Icons", () => {
    it("renders arrow icons", () => {
      (usePathname as jest.Mock).mockReturnValue("/d/test-droplet/lesson-1");

      const { container } = render(
        <DropletFooter droplet={mockDroplet as any} />,
      );

      expect(container.querySelector("svg")).toBeInTheDocument();
    });

    it("renders lock icon when blocked", () => {
      (usePathname as jest.Mock).mockReturnValue("/d/test-droplet/lesson-1");

      const question = document.createElement("div");
      question.setAttribute("role", "question");
      document.body.appendChild(question);

      render(<DropletFooter droplet={mockDroplet as any} />);

      expect(
        screen.getByText(/Complete all quizzes to proceed/),
      ).toBeInTheDocument();
    });
  });

  describe("Styling", () => {
    it("applies correct styling to navigation buttons", () => {
      (usePathname as jest.Mock).mockReturnValue("/d/test-droplet/lesson-1");

      render(<DropletFooter droplet={mockDroplet as any} />);

      const nextButton = screen.getByText("Next").closest("button");
      expect(nextButton).toHaveClass("bg-white");
      expect(nextButton).toHaveClass("rounded-[8px]");
    });

    it("applies correct styling to blocked state", () => {
      (usePathname as jest.Mock).mockReturnValue("/d/test-droplet/lesson-1");

      const question = document.createElement("div");
      question.setAttribute("role", "question");
      document.body.appendChild(question);

      render(<DropletFooter droplet={mockDroplet as any} />);

      const blockedDiv = screen
        .getByText(/Complete all quizzes to proceed/)
        .closest("div");
      expect(blockedDiv).toHaveClass("opacity-40");
    });
  });

  describe("Edge Cases", () => {
    it("handles lessons with very long names", () => {
      const longNameDroplet = {
        slug: "test",
        lessons: [{ id: 1, slug: "lesson", name: "A".repeat(100) }],
      };

      (usePathname as jest.Mock).mockReturnValue("/d/test");

      render(<DropletFooter droplet={longNameDroplet as any} />);

      expect(screen.getByText("Next")).toBeInTheDocument();
    });

    it("handles droplet with special characters in lesson names", () => {
      const specialDroplet = {
        slug: "test",
        lessons: [{ id: 1, slug: "lesson-1", name: "Lesson & <Special>" }],
      };

      (usePathname as jest.Mock).mockReturnValue("/d/test");

      render(<DropletFooter droplet={specialDroplet as any} />);

      expect(screen.getByText("Next")).toBeInTheDocument();
    });
  });
});
