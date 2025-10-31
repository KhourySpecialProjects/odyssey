import { render, screen, fireEvent } from "@testing-library/react";
import Sidebar from "@/components/droplets/sidebar";
import { usePathname } from "next/navigation";
import { AuthorizedUserRoleTitle } from "@/lib/globals";

jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
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
    name: "Test Droplet",
    slug: "test-droplet",
    droplet_lessons: [
      {
        orderIndex: 0,
        id: 1,
        lesson: {
          id: 1,
          name: "Lesson 1",
          slug: "lesson-1",
          type: "general" as const,
          droplets: [],
          droplet_lessons: [],
          notes: [],
          blocks: [],
        },
      },
      {
        orderIndex: 1,
        id: 2,
        lesson: {
          id: 2,
          name: "Lesson 2",
          slug: "lesson-2",
          type: "activity" as const,
          droplets: [],
          droplet_lessons: [],
          notes: [],
          blocks: [],
        },
      },
      {
        orderIndex: 2,
        id: 3,
        lesson: {
          id: 3,
          name: "Lesson 3",
          slug: "lesson-3",
          type: "caseStudy" as const,
          droplets: [],
          droplet_lessons: [],
          notes: [],
          blocks: [],
        },
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (usePathname as jest.Mock).mockReturnValue("/d/test-droplet");
  });

  describe("Authentication", () => {
    it("renders unauthorized page when user is null", () => {
      render(
        <Sidebar
          user={null}
          author={false}
          droplet={mockDroplet}
          completedLessonIds={[]}
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
        />,
      );

      expect(screen.getByText("Edit")).toBeInTheDocument();
    });

    it("shows edit button for admins", () => {
      render(
        <Sidebar
          user={mockAdminUser}
          author={false}
          droplet={mockDroplet}
          completedLessonIds={[]}
        />,
      );

      expect(screen.getByText("Edit")).toBeInTheDocument();
    });

    it("does not show edit button for regular users", () => {
      render(
        <Sidebar
          user={mockUser}
          author={false}
          droplet={mockDroplet}
          completedLessonIds={[]}
        />,
      );

      expect(screen.queryByText("Edit")).not.toBeInTheDocument();
    });

    it("edit button links to correct path", () => {
      (usePathname as jest.Mock).mockReturnValue("/d/test-droplet");

      render(
        <Sidebar
          user={mockUser}
          author={true}
          droplet={mockDroplet}
          completedLessonIds={[]}
        />,
      );

      const editButton = screen.getByText("Edit");
      // The component generates /draft/d// + pathname after d/
      expect(editButton).toHaveAttribute("href", "/draft/d//test-droplet");
    });

    it("edit button links correctly from recap page", () => {
      (usePathname as jest.Mock).mockReturnValue("/d/test-droplet/recap");

      render(
        <Sidebar
          user={mockUser}
          author={true}
          droplet={mockDroplet}
          completedLessonIds={[]}
        />,
      );

      const editButton = screen.getByText("Edit");
      expect(editButton).toHaveAttribute("href", "/draft/d/test-droplet");
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
        />,
      );

      expect(screen.getByText("67% complete")).toBeInTheDocument();
    });

    it("handles droplet with no lessons", () => {
      const dropletNoLessons = {
        ...mockDroplet,
        droplet_lessons: [],
      };

      render(
        <Sidebar
          user={mockUser}
          author={false}
          droplet={dropletNoLessons}
          completedLessonIds={[]}
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
        />,
      );

      const lesson2Link = screen.getByText("Lesson 2").closest("a");
      expect(lesson2Link).toHaveClass("pointer-events-none");
      expect(lesson2Link).toHaveAttribute("aria-disabled", "true");
    });
  });

  describe("Lesson Icons", () => {
    it("shows BookTextIcon for general lessons", () => {
      const { container } = render(
        <Sidebar
          user={mockUser}
          author={true}
          droplet={mockDroplet}
          completedLessonIds={[]}
        />,
      );

      const lesson1 = screen.getByText("Lesson 1").closest("a");
      const icon = lesson1?.querySelector(".lucide-book-text");
      expect(icon).toBeInTheDocument();
    });

    it("shows HammerIcon for activity lessons", () => {
      const { container } = render(
        <Sidebar
          user={mockUser}
          author={true}
          droplet={mockDroplet}
          completedLessonIds={[]}
        />,
      );

      const lesson2 = screen.getByText("Lesson 2").closest("a");
      const icon = lesson2?.querySelector(".lucide-hammer");
      expect(icon).toBeInTheDocument();
    });

    it("shows FilePieChartIcon for case study lessons", () => {
      const { container } = render(
        <Sidebar
          user={mockUser}
          author={true}
          droplet={mockDroplet}
          completedLessonIds={[]}
        />,
      );

      const lesson3 = screen.getByText("Lesson 3").closest("a");
      const icon = lesson3?.querySelector(".lucide-file-pie-chart");
      expect(icon).toBeInTheDocument();
    });
  });

  describe("Completion Indicators", () => {
    it("shows checkmark for completed lessons when enrolled", () => {
      render(
        <Sidebar
          user={mockUser}
          author={false}
          droplet={mockDroplet}
          completedLessonIds={[1]}
          enrollmentId="enrollment-123"
        />,
      );

      expect(screen.getByTestId("check-circle-icon")).toBeInTheDocument();
    });

    it("does not show checkmark for locked completed lessons", () => {
      render(
        <Sidebar
          user={mockUser}
          author={false}
          droplet={mockDroplet}
          completedLessonIds={[2]}
          enrollmentId="enrollment-123"
        />,
      );

      expect(screen.queryByTestId("check-circle-icon")).not.toBeInTheDocument();
    });

    it("shows checkmarks for multiple completed lessons", () => {
      render(
        <Sidebar
          user={mockUser}
          author={false}
          droplet={mockDroplet}
          completedLessonIds={[1, 2]}
          enrollmentId="enrollment-123"
        />,
      );

      expect(screen.getAllByTestId("check-circle-icon")).toHaveLength(2);
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
        />,
      );

      const expandButton = screen.getByTestId("sidebar-overlay");
      fireEvent.click(expandButton);

      expect(screen.getByRole("complementary")).toHaveClass("translate-x-0");
    });

    it("closes sidebar when overlay is clicked", () => {
      const { container } = render(
        <Sidebar
          user={mockUser}
          author={false}
          droplet={mockDroplet}
          completedLessonIds={[]}
        />,
      );

      fireEvent.click(screen.getByTestId("sidebar-overlay"));

      const overlay = container.querySelector(".bg-slate-900\\/50");
      if (overlay) {
        fireEvent.click(overlay);
      }

      expect(screen.getByRole("complementary")).toHaveClass(
        "-translate-x-full",
      );
    });

    it("closes sidebar when clicking a lesson link", () => {
      render(
        <Sidebar
          user={mockUser}
          author={true}
          droplet={mockDroplet}
          completedLessonIds={[]}
        />,
      );

      fireEvent.click(screen.getByTestId("sidebar-overlay"));
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
        />,
      );

      const overviewLink = screen.getByText("Overview").closest("a");
      expect(overviewLink).toHaveClass("bg-slate-200");
      expect(overviewLink).toHaveClass("font-bold");
    });

    it("highlights active lesson link", () => {
      (usePathname as jest.Mock).mockReturnValue("/d/test-droplet/lesson-1");

      render(
        <Sidebar
          user={mockUser}
          author={true}
          droplet={mockDroplet}
          completedLessonIds={[]}
        />,
      );

      const lesson1Link = screen.getByText("Lesson 1").closest("a");
      expect(lesson1Link).toHaveClass("bg-slate-200");
    });

    it("highlights active recap link", () => {
      (usePathname as jest.Mock).mockReturnValue("/d/test-droplet/recap");

      render(
        <Sidebar
          user={mockUser}
          author={false}
          droplet={mockDroplet}
          completedLessonIds={[]}
        />,
      );

      const recapLink = screen.getByText("Recap").closest("a");
      expect(recapLink).toHaveClass("bg-slate-200");
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
        />,
      );

      fireEvent.click(screen.getByTestId("sidebar-overlay"));
      expect(screen.getByRole("complementary")).toHaveClass("translate-x-0");

      fireEvent(window, new Event("resize"));

      expect(screen.getByRole("complementary")).toHaveClass(
        "-translate-x-full",
      );
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
        />,
      );
    });

    it("handles droplet with empty droplet_lessons array", () => {
      const emptyLessonsDroplet = {
        ...mockDroplet,
        droplet_lessons: [],
      };

      render(
        <Sidebar
          user={mockUser}
          author={false}
          droplet={emptyLessonsDroplet}
          completedLessonIds={[]}
        />,
      );

      expect(screen.getByText("Overview")).toBeInTheDocument();
      expect(screen.getByText("Recap")).toBeInTheDocument();
    });
  });
});
