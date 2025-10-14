import { render, screen, fireEvent } from "@testing-library/react";
import { ProfileContent } from "@/app/(general)/[username]/profile-content";
import { AuthorizedUser, Enrollment, Announcement } from "@/types";

// Mock Next.js navigation hooks
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  })),
  useSearchParams: jest.fn(() => ({
    get: jest.fn(() => null),
    toString: jest.fn(() => ""),
  })),
}));

// Mock Next.js Link component
jest.mock("next/link", () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
});

// Mock DOMPurify
jest.mock("dompurify", () => ({
  sanitize: (html: string) => html,
}));
describe("ProfileContent", () => {
  const mockUserData: AuthorizedUser = {
    id: 1,
    email: "test@northeastern.edu",
    firstName: "John",
    lastName: "Doe",
    bio: "<p>Test bio</p>",
    profilePhoto: null as any,
    isPublic: true,
    isEnabled: true,
    linkedin: "https://linkedin.com/in/johndoe",
    github: "https://github.com/johndoe",
    firstTime: false,
    roles: [],
    friendships: [],
    sent_requests: [],
    received_requests: [],
    blocked: [],
    was_blocked: [],
    timeZone: "America/New_York",
    droplets: [
      {
        id: 1,
        name: "Test Created Droplet",
        slug: "test-created",
        description: "<p>Created droplet description</p>",
        averageRating: 4.5,
        isHidden: false,
        status: "published",
        type: "knowledge",
        focusArea: "technical",
        learningObjectives: [],
        droplet_lessons: [],
      },
    ],
  };

  const mockEnrollments: Enrollment[] = [
    {
      id: "1",
      authorizedUser: mockUserData,
      droplet: {
        id: 2,
        name: "Test Completed Droplet",
        slug: "test-completed",
        description: "<p>Completed droplet description</p>",
        averageRating: 3.8,
        isHidden: false,
        status: "published",
        type: "skill",
        focusArea: "personal",
        learningObjectives: [],
        droplet_lessons: [],
        lessons: [],
      },
      viewedLessons: [],
      isComplete: true,
      rating: 4,
      isFirstTime: false,
      isArchived: false,
      notes: [],
      completionDate: new Date(),
    },
  ];

  const mockFriends: AuthorizedUser[] = [
    {
      id: 2,
      email: "friend@northeastern.edu",
      firstName: "Jane",
      lastName: "Smith",
      bio: "",
      profilePhoto: null as any,
      isPublic: true,
      isEnabled: true,
      linkedin: "",
      github: "",
      firstTime: false,
      roles: [],
      friendships: [],
      sent_requests: [],
      received_requests: [],
      blocked: [],
      was_blocked: [],
      timeZone: "America/New_York",
    },
  ];

  const mockAnnouncements: Announcement[] = [
    {
      id: 1,
      type: "friend",
      firstCreated: new Date("2024-01-15T10:30:00"),
      content: "John Doe has completed Test Droplet",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Profile Header", () => {
    it("renders user name correctly", () => {
      render(
        <ProfileContent
          userData={mockUserData}
          enrollments={mockEnrollments}
          friends={mockFriends}
          announcements={mockAnnouncements}
          currentUserCompletedIds={[]}
          isViewingOwnProfile={false}
        />,
      );

      expect(screen.getByText("John")).toBeInTheDocument();
      expect(screen.getByText("Doe")).toBeInTheDocument();
    });

    it("renders bio when provided", () => {
      render(
        <ProfileContent
          userData={mockUserData}
          enrollments={mockEnrollments}
          friends={mockFriends}
          announcements={mockAnnouncements}
          currentUserCompletedIds={[]}
          isViewingOwnProfile={false}
        />,
      );

      expect(screen.getByText("Test bio")).toBeInTheDocument();
    });

    it("displays social links when provided", () => {
      const { container } = render(
        <ProfileContent
          userData={mockUserData}
          enrollments={mockEnrollments}
          friends={mockFriends}
          announcements={mockAnnouncements}
          currentUserCompletedIds={[]}
          isViewingOwnProfile={false}
        />,
      );

      const linkedInLink = container.querySelector('a[aria-label="LinkedIn"]');
      const githubLink = container.querySelector('a[aria-label="GitHub"]');

      expect(linkedInLink).toHaveAttribute(
        "href",
        "https://linkedin.com/in/johndoe",
      );
      expect(githubLink).toHaveAttribute("href", "https://github.com/johndoe");
    });
  });

  describe("Statistics Panel", () => {
    it("calculates total enrollments correctly", () => {
      const { container } = render(
        <ProfileContent
          userData={mockUserData}
          enrollments={mockEnrollments}
          friends={mockFriends}
          announcements={mockAnnouncements}
          currentUserCompletedIds={[]}
          isViewingOwnProfile={false}
        />,
      );

      // Find the enrollments stat specifically by looking near "Enrollments" text
      const enrollmentsSection = screen.getByText("Enrollments").closest("div");
      expect(enrollmentsSection).toHaveTextContent("1");
    });

    it("calculates completion rate correctly", () => {
      render(
        <ProfileContent
          userData={mockUserData}
          enrollments={mockEnrollments}
          friends={mockFriends}
          announcements={mockAnnouncements}
          currentUserCompletedIds={[]}
          isViewingOwnProfile={false}
        />,
      );

      expect(screen.getByText("100%")).toBeInTheDocument();
      expect(screen.getByText("Completion")).toBeInTheDocument();
    });

    it("shows correct number of created droplets", () => {
      render(
        <ProfileContent
          userData={mockUserData}
          enrollments={mockEnrollments}
          friends={mockFriends}
          announcements={mockAnnouncements}
          currentUserCompletedIds={[]}
          isViewingOwnProfile={false}
        />,
      );

      expect(screen.getByText("Created")).toBeInTheDocument();
    });

    it("handles zero enrollments correctly", () => {
      render(
        <ProfileContent
          userData={mockUserData}
          enrollments={[]}
          friends={mockFriends}
          announcements={mockAnnouncements}
          currentUserCompletedIds={[]}
          isViewingOwnProfile={false}
        />,
      );

      expect(screen.getByText("0")).toBeInTheDocument();
      expect(screen.getByText("0%")).toBeInTheDocument();
    });
  });

  describe("Tabs Functionality", () => {
    it("shows Droplets Completed tab by default", () => {
      render(
        <ProfileContent
          userData={mockUserData}
          enrollments={mockEnrollments}
          friends={mockFriends}
          announcements={mockAnnouncements}
          currentUserCompletedIds={[]}
          isViewingOwnProfile={false}
        />,
      );

      expect(screen.getByText("Droplets Completed")).toBeInTheDocument();
      expect(screen.getByText("Test Completed Droplet")).toBeInTheDocument();
    });

    it("shows Droplets Created tab only when user has created droplets", () => {
      render(
        <ProfileContent
          userData={mockUserData}
          enrollments={mockEnrollments}
          friends={mockFriends}
          announcements={mockAnnouncements}
          currentUserCompletedIds={[]}
          isViewingOwnProfile={false}
        />,
      );

      expect(screen.getByText("Droplets Created")).toBeInTheDocument();
    });

    it("does not show Droplets Created tab when user has no created droplets", () => {
      const userWithoutDroplets = { ...mockUserData, droplets: [] };

      render(
        <ProfileContent
          userData={userWithoutDroplets}
          enrollments={mockEnrollments}
          friends={mockFriends}
          announcements={mockAnnouncements}
          currentUserCompletedIds={[]}
          isViewingOwnProfile={false}
        />,
      );

      expect(screen.queryByText("Droplets Created")).not.toBeInTheDocument();
    });

    it("switches to Friends tab when clicked", () => {
      render(
        <ProfileContent
          userData={mockUserData}
          enrollments={mockEnrollments}
          friends={mockFriends}
          announcements={mockAnnouncements}
          currentUserCompletedIds={[]}
          isViewingOwnProfile={false}
        />,
      );

      fireEvent.click(screen.getByText("Friends"));
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    });
  });

  describe("Completion Badge", () => {
    it("shows completion badge when viewing others profile and droplet is completed", () => {
      render(
        <ProfileContent
          userData={mockUserData}
          enrollments={mockEnrollments}
          friends={mockFriends}
          announcements={mockAnnouncements}
          currentUserCompletedIds={[1]} // Viewer completed droplet ID 1
          isViewingOwnProfile={false}
        />,
      );

      // Switch to Droplets Created tab
      fireEvent.click(screen.getByText("Droplets Created"));

      expect(screen.getByText("Completed")).toBeInTheDocument();
    });

    it("does not show completion badge when viewing own profile", () => {
      render(
        <ProfileContent
          userData={mockUserData}
          enrollments={mockEnrollments}
          friends={mockFriends}
          announcements={mockAnnouncements}
          currentUserCompletedIds={[1]}
          isViewingOwnProfile={true} // Viewing own profile
        />,
      );

      fireEvent.click(screen.getByText("Droplets Created"));

      expect(screen.queryByText("Completed")).not.toBeInTheDocument();
    });

    it("does not show completion badge when viewer has not completed droplet", () => {
      render(
        <ProfileContent
          userData={mockUserData}
          enrollments={mockEnrollments}
          friends={mockFriends}
          announcements={mockAnnouncements}
          currentUserCompletedIds={[]} // No completed droplets
          isViewingOwnProfile={false}
        />,
      );

      fireEvent.click(screen.getByText("Droplets Created"));

      expect(screen.queryByText("Completed")).not.toBeInTheDocument();
    });
  });

  describe("Droplet Ratings", () => {
    it("displays rating on completed droplet tiles when available", () => {
      render(
        <ProfileContent
          userData={mockUserData}
          enrollments={mockEnrollments}
          friends={mockFriends}
          announcements={mockAnnouncements}
          currentUserCompletedIds={[]}
          isViewingOwnProfile={false}
        />,
      );

      expect(screen.getByText("3.8")).toBeInTheDocument();
    });

    it("displays rating on created droplet tiles when available", () => {
      render(
        <ProfileContent
          userData={mockUserData}
          enrollments={mockEnrollments}
          friends={mockFriends}
          announcements={mockAnnouncements}
          currentUserCompletedIds={[]}
          isViewingOwnProfile={false}
        />,
      );

      fireEvent.click(screen.getByText("Droplets Created"));
      expect(screen.getByText("4.5")).toBeInTheDocument();
    });

    it("does not display rating when not available", () => {
      const dropletWithoutRating = {
        ...mockEnrollments[0],
        droplet: { ...mockEnrollments[0].droplet, averageRating: 0 },
      };

      render(
        <ProfileContent
          userData={mockUserData}
          enrollments={[dropletWithoutRating]}
          friends={mockFriends}
          announcements={mockAnnouncements}
          currentUserCompletedIds={[]}
          isViewingOwnProfile={false}
        />,
      );

      expect(screen.queryByText("0.0")).not.toBeInTheDocument();
    });
  });

  describe("Modal Functionality", () => {
    it("opens modal when droplet tile is clicked", () => {
      render(
        <ProfileContent
          userData={mockUserData}
          enrollments={mockEnrollments}
          friends={mockFriends}
          announcements={mockAnnouncements}
          currentUserCompletedIds={[]}
          isViewingOwnProfile={false}
        />,
      );

      fireEvent.click(screen.getByText("Test Completed Droplet"));

      // Modal should show droplet name as title
      const modalTitles = screen.getAllByText("Test Completed Droplet");
      expect(modalTitles.length).toBeGreaterThan(1); // One in tile, one in modal
    });

    it("displays View Droplet button in modal", () => {
      render(
        <ProfileContent
          userData={mockUserData}
          enrollments={mockEnrollments}
          friends={mockFriends}
          announcements={mockAnnouncements}
          currentUserCompletedIds={[]}
          isViewingOwnProfile={false}
        />,
      );

      fireEvent.click(screen.getByText("Test Completed Droplet"));

      expect(screen.getByText("View Droplet")).toBeInTheDocument();
    });

    it("closes modal when close button is clicked", () => {
      render(
        <ProfileContent
          userData={mockUserData}
          enrollments={mockEnrollments}
          friends={mockFriends}
          announcements={mockAnnouncements}
          currentUserCompletedIds={[]}
          isViewingOwnProfile={false}
        />,
      );

      fireEvent.click(screen.getByText("Test Completed Droplet"));

      const closeButton = screen.getByRole("button");
      fireEvent.click(closeButton);

      // Check if modal is closed by verifying only one instance of the name exists
      const titles = screen.queryAllByText("Test Completed Droplet");
      expect(titles).toHaveLength(1); // Only in the tile, not in modal
    });
  });

  describe("Friends Tab", () => {
    it("displays friends list correctly", () => {
      render(
        <ProfileContent
          userData={mockUserData}
          enrollments={mockEnrollments}
          friends={mockFriends}
          announcements={mockAnnouncements}
          currentUserCompletedIds={[]}
          isViewingOwnProfile={false}
        />,
      );

      fireEvent.click(screen.getByText("Friends"));

      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    });

    it("shows empty state when no friends", () => {
      render(
        <ProfileContent
          userData={mockUserData}
          enrollments={mockEnrollments}
          friends={[]}
          announcements={mockAnnouncements}
          currentUserCompletedIds={[]}
          isViewingOwnProfile={false}
        />,
      );

      fireEvent.click(screen.getByText("Friends"));

      expect(screen.getByText("No friends yet.")).toBeInTheDocument();
    });

    it("friend links have correct href format", () => {
      const { container } = render(
        <ProfileContent
          userData={mockUserData}
          enrollments={mockEnrollments}
          friends={mockFriends}
          announcements={mockAnnouncements}
          currentUserCompletedIds={[]}
          isViewingOwnProfile={false}
        />,
      );

      fireEvent.click(screen.getByText("Friends"));

      const friendLink = container.querySelector('a[href="/friend"]');
      expect(friendLink).toBeInTheDocument();
    });
  });

  describe("Recent Activity Section", () => {
    it("displays recent activity when announcements exist", () => {
      render(
        <ProfileContent
          userData={mockUserData}
          enrollments={mockEnrollments}
          friends={mockFriends}
          announcements={mockAnnouncements}
          currentUserCompletedIds={[]}
          isViewingOwnProfile={false}
        />,
      );

      expect(screen.getByText("Recent Activity")).toBeInTheDocument();
      expect(
        screen.getByText("John Doe has completed Test Droplet"),
      ).toBeInTheDocument();
    });

    it("shows empty state when no announcements", () => {
      render(
        <ProfileContent
          userData={mockUserData}
          enrollments={mockEnrollments}
          friends={mockFriends}
          announcements={[]}
          currentUserCompletedIds={[]}
          isViewingOwnProfile={false}
        />,
      );

      expect(screen.getByText("No recent activity")).toBeInTheDocument();
    });

    it("displays correct color coding for different activity types", () => {
      const mixedAnnouncements: Announcement[] = [
        {
          id: 1,
          type: "friend",
          firstCreated: new Date(),
          content: "Completed a droplet",
        },
        {
          id: 2,
          type: "kudos",
          firstCreated: new Date(),
          content: "Received kudos",
        },
        {
          id: 3,
          type: "droplet",
          firstCreated: new Date(),
          content: "Created a droplet",
        },
      ];

      const { container } = render(
        <ProfileContent
          userData={mockUserData}
          enrollments={mockEnrollments}
          friends={mockFriends}
          announcements={mixedAnnouncements}
          currentUserCompletedIds={[]}
          isViewingOwnProfile={false}
        />,
      );

      // Check for color-coded backgrounds
      expect(container.querySelector(".bg-yellow-200")).toBeInTheDocument();
      expect(container.querySelector(".bg-orange-200")).toBeInTheDocument();
      expect(container.querySelector(".bg-blue-200")).toBeInTheDocument();
    });
  });

  describe("Empty States", () => {
    it("shows message when no completed droplets", () => {
      render(
        <ProfileContent
          userData={mockUserData}
          enrollments={[]}
          friends={mockFriends}
          announcements={mockAnnouncements}
          currentUserCompletedIds={[]}
          isViewingOwnProfile={false}
        />,
      );

      expect(
        screen.getByText("No completed droplets yet."),
      ).toBeInTheDocument();
    });

    it("shows message when no friends", () => {
      render(
        <ProfileContent
          userData={mockUserData}
          enrollments={mockEnrollments}
          friends={[]}
          announcements={mockAnnouncements}
          currentUserCompletedIds={[]}
          isViewingOwnProfile={false}
        />,
      );

      fireEvent.click(screen.getByText("Friends"));
      expect(screen.getByText("No friends yet.")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles undefined droplet in enrollment", () => {
      const enrollmentWithoutDroplet: Enrollment[] = [
        {
          id: "2",
          authorizedUser: mockUserData,
          droplet: undefined as any,
          viewedLessons: [],
          isComplete: true,
          rating: 0,
          isFirstTime: false,
          isArchived: false,
          notes: [],
          completionDate: new Date(),
        },
      ];

      render(
        <ProfileContent
          userData={mockUserData}
          enrollments={enrollmentWithoutDroplet}
          friends={mockFriends}
          announcements={mockAnnouncements}
          currentUserCompletedIds={[]}
          isViewingOwnProfile={false}
        />,
      );

      // Should not crash and show empty state
      expect(
        screen.getByText("No completed droplets yet."),
      ).toBeInTheDocument();
    });

    it("handles user without bio", () => {
      const userWithoutBio = { ...mockUserData, bio: "" };

      render(
        <ProfileContent
          userData={userWithoutBio}
          enrollments={mockEnrollments}
          friends={mockFriends}
          announcements={mockAnnouncements}
          currentUserCompletedIds={[]}
          isViewingOwnProfile={false}
        />,
      );

      expect(screen.queryByText("Test bio")).not.toBeInTheDocument();
    });
  });
});
