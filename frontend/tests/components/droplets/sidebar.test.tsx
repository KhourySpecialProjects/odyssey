import { render, screen, fireEvent } from "@testing-library/react";
import Sidebar from "@/components/droplets/sidebar";
import { usePathname, useRouter } from "next/navigation";
import { AuthorizedUserRoleTitle } from "@/lib/globals";
import { Block, Droplet, Lesson } from "@/types";

jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
  useRouter: jest.fn(), // Add this
}));

jest.mock("next/link", () => {
  return ({ children, href, onClick, className, ...props }: any) => (
    <a href={href} onClick={onClick} className={className} {...props}>
      {children}
    </a>
  );
});

jest.mock("@/app/(general)/unauthorized/page", () => ({
  __esModule: true,
  default: () => <div data-testid="unauthorized">Unauthorized</div>,
}));

describe("Sidebar", () => {
  const mockSetExpanded = jest.fn();

  const mockUser = {
    id: 1,
    name: "Test User",
    email: "test@example.com",
    roles: [AuthorizedUserRoleTitle.User],
    isActive: true,
  };

  const mockAdminUser = {
    id: 2,
    name: "Admin User",
    email: "admin@example.com",
    roles: [AuthorizedUserRoleTitle.SysAdmin],
    isActive: true,
  };

  const mockDroplet = {
    id: 1, // Add this
    name: "Test Droplet",
    slug: "test-droplet",
    status: "published" as const, // Add this
    lessons: [
      {
        orderIndex: 0,
        id: 1,
        name: "Lesson 1",
        slug: "lesson-1",
        type: "general",
        droplets: [] as Droplet[],
        notes: "",
        blocks: [] as Block[],
      },
      {
        orderIndex: 1,
        id: 2,
        name: "Lesson 2",
        slug: "lesson-2",
        type: "activity",
        droplets: [] as Droplet[],
        notes: "",
        blocks: [] as Block[],
      },
      {
        orderIndex: 2,
        id: 3,
        name: "Lesson 3",
        slug: "lesson-3",
        type: "caseStudy",
        droplets: [] as Droplet[],
        notes: "",
        blocks: [] as Block[],
      },
    ] as Lesson[],
  };

  const mockRouter = {
    push: jest.fn(),
    refresh: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (usePathname as jest.Mock).mockReturnValue("/d/test-droplet");
    (useRouter as jest.Mock).mockReturnValue(mockRouter); // Add this
  });

  // ... rest of your tests remain the same

  describe("Authentication", () => {
    it("renders unauthorized page when user is null", () => {
      render(
        <Sidebar
          user={null}
          author={false}
          droplet={mockDroplet}
          completedLessonIds={[]}
          expanded={false}
          setExpanded={mockSetExpanded}
        />,
      );

      expect(screen.getByTestId("unauthorized")).toBeInTheDocument();
    });

    it("renders unauthorized page when user is undefined", () => {
      render(
        <Sidebar
          user={undefined}
          author={false}
          droplet={mockDroplet}
          completedLessonIds={[]}
          expanded={false}
          setExpanded={mockSetExpanded}
        />,
      );

      expect(screen.getByTestId("unauthorized")).toBeInTheDocument();
    });

    it("renders sidebar when user is authenticated", () => {
      render(
        <Sidebar
          user={mockUser}
          author={false}
          droplet={mockDroplet}
          completedLessonIds={[]}
          expanded={true}
          setExpanded={mockSetExpanded}
        />,
      );
    });
  });

  describe("Basic Rendering", () => {
    it("renders droplet name in both locations", () => {
      render(
        <Sidebar
          user={mockUser}
          author={false}
          droplet={mockDroplet}
          completedLessonIds={[]}
          expanded={true}
          setExpanded={mockSetExpanded}
        />,
      );
    });

    it("renders navigation links", () => {
      render(
        <Sidebar
          user={mockUser}
          author={false}
          droplet={mockDroplet}
          completedLessonIds={[]}
          expanded={true}
          setExpanded={mockSetExpanded}
        />,
      );

      expect(screen.getByText("Overview")).toBeInTheDocument();
      expect(screen.getByText("Recap")).toBeInTheDocument();
    });

    it("renders all lessons in order", () => {
      render(
        <Sidebar
          user={mockUser}
          author={false}
          droplet={mockDroplet}
          completedLessonIds={[]}
          expanded={true}
          setExpanded={mockSetExpanded}
        />,
      );

      expect(screen.getByText("Lesson 1")).toBeInTheDocument();
      expect(screen.getByText("Lesson 2")).toBeInTheDocument();
      expect(screen.getByText("Lesson 3")).toBeInTheDocument();
    });

    it("renders explore/home link", () => {
      const { container } = render(
        <Sidebar
          user={mockUser}
          author={false}
          droplet={mockDroplet}
          completedLessonIds={[]}
          expanded={true}
          setExpanded={mockSetExpanded}
        />,
      );

      const homeLink = container.querySelector('a[href="/explore"]');
      expect(homeLink).toBeInTheDocument();
    });
  });

  describe("Author/Admin Features", () => {
    it("shows edit button for authors", () => {
      render(
        <Sidebar
          user={mockUser}
          author={true}
          droplet={mockDroplet}
          completedLessonIds={[]}
          expanded={true}
          setExpanded={mockSetExpanded}
        />,
      );

      expect(screen.getByTitle("Edit droplet")).toBeInTheDocument();
    });

    it("shows edit button for admins", () => {
      render(
        <Sidebar
          user={mockAdminUser}
          author={false}
          droplet={mockDroplet}
          completedLessonIds={[]}
          expanded={true}
          setExpanded={mockSetExpanded}
        />,
      );

      expect(screen.getByTitle("Edit droplet")).toBeInTheDocument();
    });

    it("does not show edit button for regular users", () => {
      render(
        <Sidebar
          user={mockUser}
          author={false}
          droplet={mockDroplet}
          completedLessonIds={[]}
          expanded={true}
          setExpanded={mockSetExpanded}
        />,
      );

      expect(screen.queryByTitle("Edit droplet")).not.toBeInTheDocument();
    });
  });

  describe("Progress Calculation", () => {
    it("shows 0% when no lessons completed", () => {
      render(
        <Sidebar
          user={mockUser}
          author={false}
          droplet={mockDroplet}
          completedLessonIds={[]}
          expanded={true}
          setExpanded={mockSetExpanded}
        />,
      );

      expect(screen.getByText("0% complete")).toBeInTheDocument();
    });

    it("calculates progress correctly with some lessons completed", () => {
      render(
        <Sidebar
          user={mockUser}
          author={false}
          droplet={mockDroplet}
          completedLessonIds={[1]}
          expanded={true}
          setExpanded={mockSetExpanded}
        />,
      );

      expect(screen.getByText("33% complete")).toBeInTheDocument();
    });

    it("shows 100% when all lessons completed", () => {
      render(
        <Sidebar
          user={mockUser}
          author={false}
          droplet={mockDroplet}
          completedLessonIds={[1, 2, 3]}
          expanded={true}
          setExpanded={mockSetExpanded}
        />,
      );

      expect(screen.getByText("100% complete")).toBeInTheDocument();
    });

    it("handles completion with extra IDs not in droplet", () => {
      render(
        <Sidebar
          user={mockUser}
          author={false}
          droplet={mockDroplet}
          completedLessonIds={[1, 2, 999]}
          expanded={true}
          setExpanded={mockSetExpanded}
        />,
      );

      expect(screen.getByText("67% complete")).toBeInTheDocument();
    });

    it("handles droplet with no lessons", () => {
      const dropletNoLessons = {
        ...mockDroplet,
      };

      render(
        <Sidebar
          user={mockUser}
          author={false}
          droplet={dropletNoLessons}
          completedLessonIds={[]}
          expanded={true}
          setExpanded={mockSetExpanded}
        />,
      );

      expect(screen.getByText(/complete/)).toBeInTheDocument();
    });
  });

  describe("Lesson Locking Logic", () => {
    it("locks lessons when not enrolled", () => {
      render(
        <Sidebar
          user={mockUser}
          author={false}
          droplet={mockDroplet}
          completedLessonIds={[]}
          enrollmentId={undefined}
          expanded={true}
          setExpanded={mockSetExpanded}
        />,
      );

      const lesson1Link = screen.getByText("Lesson 1").closest("a");
      expect(lesson1Link).toHaveClass("pointer-events-none");
      expect(lesson1Link).toHaveClass("opacity-50");
      expect(lesson1Link).toHaveAttribute("aria-disabled", "true");
    });

    it("unlocks lessons when enrolled", () => {
      render(
        <Sidebar
          user={mockUser}
          author={false}
          droplet={mockDroplet}
          completedLessonIds={[]}
          enrollmentId="enrollment-123"
          expanded={true}
          setExpanded={mockSetExpanded}
        />,
      );

      const lesson1Link = screen.getByText("Lesson 1").closest("a");
      expect(lesson1Link).not.toHaveClass("pointer-events-none");
    });

    it("unlocks all lessons for authors", () => {
      render(
        <Sidebar
          user={mockUser}
          author={true}
          droplet={mockDroplet}
          completedLessonIds={[]}
          enrollmentId={undefined}
          expanded={true}
          setExpanded={mockSetExpanded}
        />,
      );

      const lesson1Link = screen.getByText("Lesson 1").closest("a");
      const lesson2Link = screen.getByText("Lesson 2").closest("a");

      expect(lesson1Link).not.toHaveClass("pointer-events-none");
      expect(lesson2Link).not.toHaveClass("pointer-events-none");
    });

    it("unlocks all lessons for admins", () => {
      render(
        <Sidebar
          user={mockAdminUser}
          author={false}
          droplet={mockDroplet}
          completedLessonIds={[]}
          enrollmentId={undefined}
          expanded={true}
          setExpanded={mockSetExpanded}
        />,
      );

      const lesson1Link = screen.getByText("Lesson 1").closest("a");
      const lesson2Link = screen.getByText("Lesson 2").closest("a");

      expect(lesson1Link).not.toHaveClass("pointer-events-none");
      expect(lesson2Link).not.toHaveClass("pointer-events-none");
    });

    it("locks second lesson when first is not completed", () => {
      render(
        <Sidebar
          user={mockUser}
          author={false}
          droplet={mockDroplet}
          completedLessonIds={[]}
          enrollmentId="enrollment-123"
          expanded={true}
          setExpanded={mockSetExpanded}
        />,
      );

      const lesson2Link = screen.getByText("Lesson 2").closest("a");
      expect(lesson2Link).toHaveClass("pointer-events-none");
      expect(screen.getAllByTestId("lock-icon")).toHaveLength(2);
    });

    it("unlocks second lesson when first is completed", () => {
      render(
        <Sidebar
          user={mockUser}
          author={false}
          droplet={mockDroplet}
          completedLessonIds={[1]}
          enrollmentId="enrollment-123"
          expanded={true}
          setExpanded={mockSetExpanded}
        />,
      );

      const lesson2Link = screen.getByText("Lesson 2").closest("a");
      expect(lesson2Link).not.toHaveClass("pointer-events-none");
    });

    it("shows lock icons for locked lessons", () => {
      render(
        <Sidebar
          user={mockUser}
          author={false}
          droplet={mockDroplet}
          completedLessonIds={[]}
          enrollmentId="enrollment-123"
          expanded={true}
          setExpanded={mockSetExpanded}
        />,
      );

      expect(screen.getAllByTestId("lock-icon")).toHaveLength(2);
    });

    it("locked lessons have aria-disabled attribute", () => {
      render(
        <Sidebar
          user={mockUser}
          author={false}
          droplet={mockDroplet}
          completedLessonIds={[]}
          enrollmentId="enrollment-123"
          expanded={true}
          setExpanded={mockSetExpanded}
        />,
      );

      const lesson2Link = screen.getByText("Lesson 2").closest("a");
      expect(lesson2Link).toHaveClass("pointer-events-none");
      expect(lesson2Link).toHaveAttribute("aria-disabled", "true");
    });
  });

  describe("Lesson Icons", () => {
    it("renders lesson indicator for general lessons", () => {
      render(
        <Sidebar
          user={mockUser}
          author={true}
          droplet={mockDroplet}
          completedLessonIds={[]}
          expanded={true}
          setExpanded={mockSetExpanded}
        />,
      );

      const lesson1 = screen.getByText("Lesson 1").closest("a");
      expect(lesson1).toBeInTheDocument();
    });

    it("renders lesson indicator for activity lessons", () => {
      render(
        <Sidebar
          user={mockUser}
          author={true}
          droplet={mockDroplet}
          completedLessonIds={[]}
          expanded={true}
          setExpanded={mockSetExpanded}
        />,
      );

      const lesson2 = screen.getByText("Lesson 2").closest("a");
      expect(lesson2).toBeInTheDocument();
    });

    it("renders lesson indicator for case study lessons", () => {
      render(
        <Sidebar
          user={mockUser}
          author={true}
          droplet={mockDroplet}
          completedLessonIds={[]}
          expanded={true}
          setExpanded={mockSetExpanded}
        />,
      );

      const lesson3 = screen.getByText("Lesson 3").closest("a");
      expect(lesson3).toBeInTheDocument();
    });
  });

  describe("Completion Indicators", () => {
    it("shows no lock icon for completed and unlocked lesson", () => {
      render(
        <Sidebar
          user={mockUser}
          author={false}
          droplet={mockDroplet}
          completedLessonIds={[1]}
          enrollmentId="enrollment-123"
          expanded={true}
          setExpanded={mockSetExpanded}
        />,
      );

      // Lesson 1 completed → lesson 2 unlocked; lesson 2 not completed → lesson 3 locked
      expect(screen.getAllByTestId("lock-icon")).toHaveLength(1);
    });

    it("does not unlock lessons when completed but previous incomplete", () => {
      render(
        <Sidebar
          user={mockUser}
          author={false}
          droplet={mockDroplet}
          completedLessonIds={[2]}
          enrollmentId="enrollment-123"
          expanded={true}
          setExpanded={mockSetExpanded}
        />,
      );

      // Lesson 2 is completed but lesson 1 is not, so lesson 2 is still locked
      const lesson2Link = screen.getByText("Lesson 2").closest("a");
      expect(lesson2Link).toHaveClass("pointer-events-none");
    });

    it("unlocks multiple lessons when previous ones are completed", () => {
      render(
        <Sidebar
          user={mockUser}
          author={false}
          droplet={mockDroplet}
          completedLessonIds={[1, 2]}
          enrollmentId="enrollment-123"
          expanded={true}
          setExpanded={mockSetExpanded}
        />,
      );

      // Lessons 1 and 2 completed → all 3 lessons unlocked, no lock icons
      expect(screen.queryAllByTestId("lock-icon")).toHaveLength(0);
    });
  });

  describe("Mobile Menu", () => {
    it("renders mobile menu toggle button", () => {
      render(
        <Sidebar
          user={mockUser}
          author={false}
          droplet={mockDroplet}
          completedLessonIds={[]}
          expanded={false}
          setExpanded={mockSetExpanded}
        />,
      );

      expect(
        screen.getAllByRole("button", { name: /open sidebar/i })[0],
      ).toBeInTheDocument();
    });

    it("expands sidebar when toggle button is clicked", () => {
      render(
        <Sidebar
          user={mockUser}
          author={false}
          droplet={mockDroplet}
          completedLessonIds={[]}
          expanded={false}
          setExpanded={mockSetExpanded}
        />,
      );

      const expandButton = screen.getByTestId("sidebar-overlay");
      fireEvent.click(expandButton);

      expect(mockSetExpanded).toHaveBeenCalledWith(true);
    });

    it("closes sidebar when overlay is clicked", () => {
      const { container } = render(
        <Sidebar
          user={mockUser}
          author={false}
          droplet={mockDroplet}
          completedLessonIds={[]}
          expanded={true}
          setExpanded={mockSetExpanded}
        />,
      );

      const overlay = container.querySelector(".bg-slate-900\\/50");
      if (overlay) {
        fireEvent.click(overlay);
      }

      expect(mockSetExpanded).toHaveBeenCalledWith(false);
    });

    it("closes sidebar when clicking a lesson link", () => {
      render(
        <Sidebar
          user={mockUser}
          author={true}
          droplet={mockDroplet}
          completedLessonIds={[]}
          expanded={true}
          setExpanded={mockSetExpanded}
        />,
      );

      fireEvent.click(screen.getByText("Lesson 1"));
    });
  });

  describe("Active Link Styling", () => {
    it("highlights active overview link", () => {
      (usePathname as jest.Mock).mockReturnValue("/d/test-droplet");

      render(
        <Sidebar
          user={mockUser}
          author={false}
          droplet={mockDroplet}
          completedLessonIds={[]}
          expanded={true}
          setExpanded={mockSetExpanded}
        />,
      );

      const overviewLink = screen.getByText("Overview").closest("a");
      expect(overviewLink).toHaveClass("bg-[#2D7597]");
      expect(overviewLink).toHaveClass("text-white");
    });

    it("highlights active lesson link", () => {
      (usePathname as jest.Mock).mockReturnValue("/d/test-droplet/lesson-1");

      render(
        <Sidebar
          user={mockUser}
          author={true}
          droplet={mockDroplet}
          completedLessonIds={[]}
          expanded={true}
          setExpanded={mockSetExpanded}
        />,
      );

      const lesson1Link = screen.getByText("Lesson 1").closest("a");
      expect(lesson1Link).toHaveClass("bg-[#2D7597]");
    });

    it("highlights active recap link", () => {
      (usePathname as jest.Mock).mockReturnValue("/d/test-droplet/recap");

      render(
        <Sidebar
          user={mockUser}
          author={false}
          droplet={mockDroplet}
          completedLessonIds={[]}
          expanded={true}
          setExpanded={mockSetExpanded}
        />,
      );

      const recapLink = screen.getByText("Recap").closest("a");
      expect(recapLink).toHaveClass("bg-[#2D7597]");
    });
  });

  describe("Event Listeners", () => {
    it("adds resize event listener on mount", () => {
      const addEventListenerSpy = jest.spyOn(window, "addEventListener");

      render(
        <Sidebar
          user={mockUser}
          author={false}
          droplet={mockDroplet}
          completedLessonIds={[]}
          expanded={false}
          setExpanded={mockSetExpanded}
        />,
      );

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "resize",
        expect.any(Function),
      );

      addEventListenerSpy.mockRestore();
    });

    it("removes resize event listener on unmount", () => {
      const removeEventListenerSpy = jest.spyOn(window, "removeEventListener");

      const { unmount } = render(
        <Sidebar
          user={mockUser}
          author={false}
          droplet={mockDroplet}
          completedLessonIds={[]}
          expanded={false}
          setExpanded={mockSetExpanded}
        />,
      );

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalled();

      removeEventListenerSpy.mockRestore();
    });

    it("closes sidebar on window resize", () => {
      render(
        <Sidebar
          user={mockUser}
          author={false}
          droplet={mockDroplet}
          completedLessonIds={[]}
          expanded={false}
          setExpanded={mockSetExpanded}
        />,
      );

      fireEvent(window, new Event("resize"));

      expect(mockSetExpanded).toHaveBeenCalledWith(false);
    });
  });

  describe("Edge Cases", () => {
    it("handles empty completed lesson IDs", () => {
      render(
        <Sidebar
          user={mockUser}
          author={false}
          droplet={mockDroplet}
          completedLessonIds={[]}
          expanded={true}
          setExpanded={mockSetExpanded}
        />,
      );

      expect(screen.getByText("0% complete")).toBeInTheDocument();
    });

    it("handles very long droplet name", () => {
      const longNameDroplet = {
        ...mockDroplet,
        name: "A".repeat(100),
      };

      render(
        <Sidebar
          user={mockUser}
          author={false}
          droplet={longNameDroplet}
          completedLessonIds={[]}
          expanded={true}
          setExpanded={mockSetExpanded}
        />,
      );
    });

    it("handles droplet with empty lessons array", () => {
      const emptyLessonsDroplet = {
        ...mockDroplet,
        lessons: [],
      };

      render(
        <Sidebar
          user={mockUser}
          author={false}
          droplet={emptyLessonsDroplet}
          completedLessonIds={[]}
          expanded={true}
          setExpanded={mockSetExpanded}
        />,
      );

      expect(screen.getByText("Overview")).toBeInTheDocument();
      expect(screen.getByText("Recap")).toBeInTheDocument();
    });
  });
});
