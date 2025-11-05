import { render, screen, fireEvent, act } from "@testing-library/react";
import { Sidebar } from "@/components/draft/sidebar";
import { useRouter, usePathname } from "next/navigation";
import { createDropletAnnouncement } from "@/lib/requests/feed";
import { AuthorizedUserRoleTitle } from "@/lib/globals";
import { DropletStatus, TimeZone } from "@/types";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}));

jest.mock("next-auth/react", () => ({
  signOut: jest.fn(),
}));

jest.mock("@/lib/requests/feed", () => ({
  createDropletAnnouncement: jest.fn(),
}));

jest.mock("@/components/draft/add-lesson", () => ({
  AddLesson: () => <div data-testid="add-lesson" />,
}));

describe("Sidebar", () => {
  const mockUser = {
    name: "Test User",
    email: "test@test.com",
    roles: [AuthorizedUserRoleTitle.User],
    isActive: true,
  };

  const mockLesson = {
    id: 1,
    name: "Test Lesson",
    slug: "test-lesson",
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

  const mockDroplet = {
    id: 1,
    name: "Test Droplet",
    slug: "test-droplet",
    status: "published" as DropletStatus,
    lessons: [{ ...mockLesson, orderIndex: 0 }],
  };

  const mockAuthorizedUser = {
    id: 1,
    email: `user@example.com`,
    isEnabled: true,
    roles: [],
    linkedin: "https://www.google.com/",
    github: "https://www.google.com/",
    firstName: "first",
    lastName: "last",
    bio: "bio",
    firstTime: false,
    friendships: [],
    sent_requests: [],
    received_requests: [],
    profilePhoto: "",
    blocked: [],
    was_blocked: [],
    timeZone: "America/New_York" as TimeZone,
    isPublic: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (usePathname as jest.Mock).mockReturnValue("/test");
    (createDropletAnnouncement as jest.Mock).mockResolvedValue({
      success: true,
    });
  });

  it("renders droplet name and lessons", () => {
    render(
      <Sidebar
        user={mockUser as any}
        droplet={mockDroplet as any}
        authorizedUser={mockAuthorizedUser as any}
      />,
    );
    expect(screen.getByText("Test Lesson")).toBeInTheDocument();
  });

  it("toggles mobile menu", () => {
    render(
      <Sidebar
        user={mockUser as any}
        droplet={mockDroplet as any}
        authorizedUser={mockAuthorizedUser as any}
      />,
    );
    const menuButton = screen.getByRole("button", { name: /open sidebar/i });
    fireEvent.click(menuButton);
    expect(screen.getByRole("complementary")).toHaveClass(
      "fixed xl:sticky xl:top-0 left-0 z-40 w-64 h-screen transition-transform translate-x-0",
    );
  });

  const mockRouter = {
    push: jest.fn(),
  };

  it("handles droplet announcement", async () => {
    render(
      <Sidebar
        user={mockUser}
        droplet={mockDroplet}
        authorizedUser={mockAuthorizedUser}
      />,
    );

    fireEvent.click(screen.getByTestId("home"));

    await act(async () => {
      fireEvent.click(screen.getByText("Share"));
    });

    expect(createDropletAnnouncement).toHaveBeenCalledWith(
      mockDroplet.name,
      mockDroplet.id,
    );
    expect(mockRouter.push).toHaveBeenCalledWith("/my-content");
  });

  it("handles lesson reordering", () => {
    render(
      <Sidebar
        user={mockUser}
        droplet={mockDroplet}
        authorizedUser={mockAuthorizedUser}
      />,
    );

    const lists = screen.getAllByRole("list");
    expect(lists.length).toBeGreaterThan(0);
  });

  it("expands/collapses on mobile", () => {
    render(
      <Sidebar
        user={mockUser}
        droplet={mockDroplet}
        authorizedUser={mockAuthorizedUser}
      />,
    );

    const menuButton = screen.getByRole("button", { name: /open sidebar/i });
    fireEvent.click(menuButton);

    const sidebar = screen.getByRole("complementary");
    expect(sidebar).toHaveClass(
      "fixed xl:sticky xl:top-0 left-0 z-40 w-64 h-screen transition-transform translate-x-0",
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (usePathname as jest.Mock).mockReturnValue("/draft/d/test-droplet");
  });

  it("should handle mobile menu expansion", () => {
    render(
      <Sidebar user={mockUser} droplet={mockDroplet} authorizedUser={null} />,
    );

    const menuButton = screen.getByRole("button", { name: /open sidebar/i });
    fireEvent.click(menuButton);

    expect(screen.getByRole("complementary")).toHaveClass(
      "fixed xl:sticky xl:top-0 left-0 z-40 w-64 h-screen transition-transform translate-x-0",
    );
  });
});
