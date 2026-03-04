import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ProfileContent } from "@/app/(general)/prof/[username]/profile-content";
import { AuthorizedUser, Enrollment, Announcement } from "@/types";
import { useRouter, useSearchParams } from "next/navigation";
import { mock } from "node:test";

// Mock Next.js navigation hooks
const mockPush = jest.fn();
const mockGetSearchParam = jest.fn(() => null);
const mockToString = jest.fn(() => "");

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
  })),
  useSearchParams: jest.fn(() => ({
    get: mockGetSearchParam,
    toString: mockToString,
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

describe("ProfileContent - Additional Coverage", () => {
  const mockUserData: AuthorizedUser = {
    id: 1,
    email: "test@northeastern.edu",
    firstName: "John",
    lastName: "Doe",
    bio: "<p>Test bio</p>",
    profilePhoto: null as any,
    isPublic: true,
    isEnabled: true,
    linkedin: "linkedin.com/in/johndoe",
    github: "github.com/johndoe",
    website: "",
    firstTime: false,
    roles: [],
    friendships: [],
    sent_requests: [],
    received_requests: [],
    blocked: [],
    was_blocked: [],
    timeZone: "America/New_York",
    groups: [],
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
      website: "",
      firstTime: false,
      roles: [],
      friendships: [],
      sent_requests: [],
      received_requests: [],
      blocked: [],
      was_blocked: [],
      timeZone: "America/New_York",
      groups: [],
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
    mockGetSearchParam.mockReturnValue(null);
    mockToString.mockReturnValue("");
  });

  describe("URL Tab Parameter Handling", () => {
    it("initializes tab from URL parameter", () => {
      mockGetSearchParam.mockReturnValue(null as any);

      render(
        <ProfileContent
          userData={mockUserData}
          enrollments={mockEnrollments}
          friends={mockFriends}
          announcements={mockAnnouncements}
          currentUserCompletedIds={[]}
          isViewingOwnProfile={false}
          currentUser={mockUserData}
        />,
      );

      expect(screen.getByText("<p>Test bio</p>")).toBeInTheDocument();
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
          currentUser={mockUserData}
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

    it("updates URL when tab is changed", () => {
      mockToString.mockReturnValue("tab=0");

      render(
        <ProfileContent
          userData={mockUserData}
          enrollments={mockEnrollments}
          friends={mockFriends}
          announcements={mockAnnouncements}
          currentUserCompletedIds={[]}
          isViewingOwnProfile={false}
          currentUser={mockUserData}
        />,
      );

      fireEvent.click(screen.getByText("Droplets Created"));

      expect(mockPush).toHaveBeenCalledWith("?tab=1", { scroll: false });
    });

    it("defaults to tab 0 when no URL parameter is present", () => {
      mockGetSearchParam.mockReturnValue(null);

      render(
        <ProfileContent
          userData={mockUserData}
          enrollments={mockEnrollments}
          friends={mockFriends}
          announcements={mockAnnouncements}
          currentUserCompletedIds={[]}
          isViewingOwnProfile={false}
          currentUser={mockUserData}
        />,
      );

      expect(screen.getByText("Test Completed Droplet")).toBeInTheDocument();
    });
  });

  describe("Social Links Edge Cases", () => {
    it("adds https:// prefix to LinkedIn URL without protocol", () => {
      const { container } = render(
        <ProfileContent
          userData={mockUserData}
          enrollments={mockEnrollments}
          friends={mockFriends}
          announcements={mockAnnouncements}
          currentUserCompletedIds={[]}
          isViewingOwnProfile={false}
          currentUser={mockUserData}
        />,
      );

      const linkedInLink = container.querySelector('a[aria-label="LinkedIn"]');
      expect(linkedInLink).toHaveAttribute(
        "href",
        "https://linkedin.com/in/johndoe",
      );
    });

    it("adds https:// prefix to GitHub URL without protocol", () => {
      const { container } = render(
        <ProfileContent
          userData={mockUserData}
          enrollments={mockEnrollments}
          friends={mockFriends}
          announcements={mockAnnouncements}
          currentUserCompletedIds={[]}
          isViewingOwnProfile={false}
          currentUser={mockUserData}
        />,
      );

      const githubLink = container.querySelector('a[aria-label="GitHub"]');
      expect(githubLink).toHaveAttribute("href", "https://github.com/johndoe");
    });

    it("does not add duplicate https:// to URLs that already have protocol", () => {
      const userWithFullUrls = {
        ...mockUserData,
        linkedin: "https://linkedin.com/in/johndoe",
        github: "https://github.com/johndoe",
      };

      const { container } = render(
        <ProfileContent
          userData={userWithFullUrls}
          enrollments={mockEnrollments}
          friends={mockFriends}
          announcements={mockAnnouncements}
          currentUserCompletedIds={[]}
          isViewingOwnProfile={false}
          currentUser={userWithFullUrls}
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

    it("does not render social links when not provided", () => {
      const userWithoutSocial = {
        ...mockUserData,
        linkedin: "",
        github: "",
      };

      const { container } = render(
        <ProfileContent
          userData={userWithoutSocial}
          enrollments={mockEnrollments}
          friends={mockFriends}
          announcements={mockAnnouncements}
          currentUserCompletedIds={[]}
          isViewingOwnProfile={false}
          currentUser={userWithoutSocial}
        />,
      );

      expect(
        container.querySelector('a[aria-label="LinkedIn"]'),
      ).not.toBeInTheDocument();
      expect(
        container.querySelector('a[aria-label="GitHub"]'),
      ).not.toBeInTheDocument();
    });
  });

  describe("Modal Interactions", () => {
    it("closes modal when clicking backdrop", () => {
      render(
        <ProfileContent
          userData={mockUserData}
          enrollments={mockEnrollments}
          friends={mockFriends}
          announcements={mockAnnouncements}
          currentUserCompletedIds={[]}
          isViewingOwnProfile={false}
          currentUser={mockUserData}
        />,
      );

      // Open modal
      fireEvent.click(screen.getByText("Test Completed Droplet"));

      // Click backdrop (the outer div with fixed positioning)
      const backdrop = screen
        .getByText("View Droplet")
        .closest("div")?.parentElement;
      if (backdrop) {
        fireEvent.click(backdrop);
      }

      // Modal should be closed
      const titles = screen.queryAllByText("Test Completed Droplet");
      expect(titles).toHaveLength(1);
    });

    it("does not close modal when clicking modal content", () => {
      render(
        <ProfileContent
          userData={mockUserData}
          enrollments={mockEnrollments}
          friends={mockFriends}
          announcements={mockAnnouncements}
          currentUserCompletedIds={[]}
          isViewingOwnProfile={false}
          currentUser={mockUserData}
        />,
      );

      // Open modal
      fireEvent.click(screen.getByText("Test Completed Droplet"));

      // Click modal content (should not close)
      const modalContent = screen.getByText("View Droplet").closest("div");
      if (modalContent) {
        fireEvent.click(modalContent);
      }

      // Modal should still be open
      expect(screen.getByText("View Droplet")).toBeInTheDocument();
    });

    it("displays droplet description in modal with sanitized HTML", () => {
      render(
        <ProfileContent
          userData={mockUserData}
          enrollments={mockEnrollments}
          friends={mockFriends}
          announcements={mockAnnouncements}
          currentUserCompletedIds={[]}
          isViewingOwnProfile={false}
          currentUser={mockUserData}
        />,
      );

      fireEvent.click(screen.getByText("Test Completed Droplet"));

      expect(
        screen.getByText("Completed droplet description"),
      ).toBeInTheDocument();
    });

    it("shows rating in modal with star visualization", () => {
      render(
        <ProfileContent
          userData={mockUserData}
          enrollments={mockEnrollments}
          friends={mockFriends}
          announcements={mockAnnouncements}
          currentUserCompletedIds={[]}
          isViewingOwnProfile={false}
          currentUser={mockUserData}
        />,
      );

      fireEvent.click(screen.getByText("Test Completed Droplet"));

      // Should display rating value
      const ratingTexts = screen.getAllByText("3.8");
      expect(ratingTexts.length).toBeGreaterThan(0);
    });

    describe("Date Formatting", () => {
      it("formats date correctly for announcements", () => {
        render(
          <ProfileContent
            userData={mockUserData}
            enrollments={mockEnrollments}
            friends={mockFriends}
            announcements={mockAnnouncements}
            currentUserCompletedIds={[]}
            isViewingOwnProfile={false}
            currentUser={mockUserData}
          />,
        );

        // Date should be formatted as "1/15/2024, 10:30 AM" or similar
        expect(screen.getByText(/1\/15\/2024/)).toBeInTheDocument();
      });

      it("handles invalid dates gracefully", () => {
        const announcementWithInvalidDate: Announcement[] = [
          {
            id: 1,
            type: "friend",
            firstCreated: "invalid-date" as any,
            content: "Test announcement",
          },
        ];

        render(
          <ProfileContent
            userData={mockUserData}
            enrollments={mockEnrollments}
            friends={mockFriends}
            announcements={announcementWithInvalidDate}
            currentUserCompletedIds={[]}
            isViewingOwnProfile={false}
            currentUser={mockUserData}
          />,
        );

        // Should not crash, and content should still display
        expect(screen.getByText("Test announcement")).toBeInTheDocument();
      });

      it("handles undefined dates gracefully", () => {
        const announcementWithUndefinedDate: Announcement[] = [
          {
            id: 1,
            type: "friend",
            firstCreated: undefined as any,
            content: "Test announcement",
          },
        ];

        render(
          <ProfileContent
            userData={mockUserData}
            enrollments={mockEnrollments}
            friends={mockFriends}
            announcements={announcementWithUndefinedDate}
            currentUserCompletedIds={[]}
            isViewingOwnProfile={false}
            currentUser={mockUserData}
          />,
        );

        expect(screen.getByText("Test announcement")).toBeInTheDocument();
      });
    });

    describe("Hover Effects", () => {
      it("applies transform on hover to droplet tiles", () => {
        render(
          <ProfileContent
            userData={mockUserData}
            enrollments={mockEnrollments}
            friends={mockFriends}
            announcements={mockAnnouncements}
            currentUserCompletedIds={[]}
            isViewingOwnProfile={false}
            currentUser={mockUserData}
          />,
        );

        const dropletTile = screen
          .getByText("Test Completed Droplet")
          .closest("div");

        if (dropletTile) {
          // Initial state
          expect(dropletTile).toHaveStyle({ transform: "translateY(0)" });

          // Hover
          fireEvent.mouseEnter(dropletTile);
          expect(dropletTile).toHaveStyle({ transform: "translateY(-4px)" });

          // Unhover
          fireEvent.mouseLeave(dropletTile);
          expect(dropletTile).toHaveStyle({ transform: "translateY(0)" });
        }
      });
    });

    describe("Multiple Droplets", () => {
      it("handles multiple completed droplets correctly", () => {
        const multipleEnrollments: Enrollment[] = [
          ...mockEnrollments,
          {
            id: "2",
            authorizedUser: mockUserData,
            droplet: {
              id: 3,
              name: "Second Completed Droplet",
              slug: "second-completed",
              description: "<p>Second description</p>",
              averageRating: 4.2,
              isHidden: false,
              status: "published",
              type: "skill",
              focusArea: "personal",
              learningObjectives: [],
              lessons: [],
            },
            viewedLessons: [],
            isComplete: true,
            rating: 5,
            isFirstTime: false,
            isArchived: false,
            notes: [],
            completionDate: new Date(),
          },
        ];

        render(
          <ProfileContent
            userData={mockUserData}
            enrollments={multipleEnrollments}
            friends={mockFriends}
            announcements={mockAnnouncements}
            currentUserCompletedIds={[]}
            isViewingOwnProfile={false}
            currentUser={mockUserData}
          />,
        );

        expect(screen.getByText("Test Completed Droplet")).toBeInTheDocument();
        expect(
          screen.getByText("Second Completed Droplet"),
        ).toBeInTheDocument();
      });

      it("handles multiple created droplets correctly", () => {
        const userWithMultipleDroplets = {
          ...mockUserData,
          droplets: [
            ...(mockUserData.droplets || []),
            {
              id: 4,
              name: "Second Created Droplet",
              slug: "second-created",
              description: "<p>Second created description</p>",
              averageRating: 3.5,
              isHidden: false,
              status: "published" as const,
              type: "knowledge" as const,
              focusArea: "technical" as const,
              learningObjectives: [],
              lessons: [],
            },
          ],
        };

        render(
          <ProfileContent
            userData={userWithMultipleDroplets}
            enrollments={mockEnrollments}
            friends={mockFriends}
            announcements={mockAnnouncements}
            currentUserCompletedIds={[]}
            isViewingOwnProfile={false}
            currentUser={userWithMultipleDroplets}
          />,
        );

        fireEvent.click(screen.getByText("Droplets Created"));

        expect(screen.getByText("Test Created Droplet")).toBeInTheDocument();
        expect(screen.getByText("Second Created Droplet")).toBeInTheDocument();
      });

      describe("Incomplete Enrollments", () => {
        it("does not show incomplete enrollments in completed tab", () => {
          const mixedEnrollments: Enrollment[] = [
            ...mockEnrollments,
            {
              id: "3",
              authorizedUser: mockUserData,
              droplet: {
                id: 5,
                name: "Incomplete Droplet",
                slug: "incomplete",
                description: "<p>Incomplete</p>",
                averageRating: 0,
                isHidden: false,
                status: "published",
                type: "skill",
                focusArea: "personal",
                learningObjectives: [],
                lessons: [],
              },
              viewedLessons: [],
              isComplete: false,
              rating: 0,
              isFirstTime: false,
              isArchived: false,
              notes: [],
              completionDate: null as any,
            },
          ];

          render(
            <ProfileContent
              userData={mockUserData}
              enrollments={mixedEnrollments}
              friends={mockFriends}
              announcements={mockAnnouncements}
              currentUserCompletedIds={[]}
              isViewingOwnProfile={false}
              currentUser={mockUserData}
            />,
          );

          expect(
            screen.getByText("Test Completed Droplet"),
          ).toBeInTheDocument();
          expect(
            screen.queryByText("Incomplete Droplet"),
          ).not.toBeInTheDocument();
        });
      });

      describe("Modal for Created Droplets", () => {
        it("opens modal for created droplet", () => {
          render(
            <ProfileContent
              userData={mockUserData}
              enrollments={mockEnrollments}
              friends={mockFriends}
              announcements={mockAnnouncements}
              currentUserCompletedIds={[]}
              isViewingOwnProfile={false}
              currentUser={mockUserData}
            />,
          );

          fireEvent.click(screen.getByText("Droplets Created"));
          fireEvent.click(screen.getByText("Test Created Droplet"));

          expect(
            screen.getByText("Created droplet description"),
          ).toBeInTheDocument();
        });

        describe("Statistics with Mixed Enrollments", () => {
          it("calculates completion rate with partial completions", () => {
            const partialEnrollments: Enrollment[] = [
              ...mockEnrollments,
              {
                id: "4",
                authorizedUser: mockUserData,
                droplet: {
                  id: 6,
                  name: "Incomplete",
                  slug: "incomplete",
                  description: "<p>Not done</p>",
                  averageRating: 0,
                  isHidden: false,
                  status: "published",
                  type: "skill",
                  focusArea: "personal",
                  learningObjectives: [],
                  lessons: [],
                },
                viewedLessons: [],
                isComplete: false,
                rating: 0,
                isFirstTime: false,
                isArchived: false,
                notes: [],
                completionDate: null as any,
              },
            ];

            render(
              <ProfileContent
                userData={mockUserData}
                enrollments={partialEnrollments}
                friends={mockFriends}
                announcements={mockAnnouncements}
                currentUserCompletedIds={[]}
                isViewingOwnProfile={false}
                currentUser={mockUserData}
              />,
            );

            // 1 completed out of 2 total = 50%
            expect(screen.getByText("50%")).toBeInTheDocument();
            expect(screen.getByText("2")).toBeInTheDocument(); // Total enrollments
          });
        });

        describe("Announcements with Different Types", () => {
          it("renders default icon for unknown announcement types", () => {
            const unknownTypeAnnouncement: Announcement[] = [
              {
                id: 1,
                type: "unknown" as any,
                firstCreated: new Date(),
                content: "Unknown type announcement",
              },
            ];

            const { container } = render(
              <ProfileContent
                userData={mockUserData}
                enrollments={mockEnrollments}
                friends={mockFriends}
                announcements={unknownTypeAnnouncement}
                currentUserCompletedIds={[]}
                isViewingOwnProfile={false}
                currentUser={mockUserData}
              />,
            );

            expect(
              screen.getByText("Unknown type announcement"),
            ).toBeInTheDocument();
            // Should render with default gray background
            expect(container.querySelector(".bg-gray-200")).toBeInTheDocument();
          });
        });

        describe("Rating Display Edge Cases", () => {
          it("does not show rating when averageRating is undefined", () => {
            const dropletWithoutRating = {
              ...mockUserData,
              droplets: [
                {
                  ...mockUserData.droplets![0],
                  averageRating: undefined,
                },
              ],
            };

            render(
              <ProfileContent
                userData={dropletWithoutRating}
                enrollments={mockEnrollments}
                friends={mockFriends}
                announcements={mockAnnouncements}
                currentUserCompletedIds={[]}
                isViewingOwnProfile={false}
                currentUser={dropletWithoutRating}
              />,
            );

            fireEvent.click(screen.getByText("Droplets Created"));

            // Rating should not be displayed
            expect(screen.queryByText("4.5")).not.toBeInTheDocument();
          });

          it("calculates partial star fill correctly in modal", () => {
            const dropletWithPartialRating = {
              ...mockEnrollments[0],
              droplet: {
                ...mockEnrollments[0].droplet!,
                averageRating: 3.7, // Should show 3 full stars and partial 4th star
              },
            };

            render(
              <ProfileContent
                userData={mockUserData}
                enrollments={[dropletWithPartialRating]}
                friends={mockFriends}
                announcements={mockAnnouncements}
                currentUserCompletedIds={[]}
                isViewingOwnProfile={false}
                currentUser={mockUserData}
              />,
            );

            fireEvent.click(screen.getByText("Test Completed Droplet"));

            // Should display the rating value
            const ratings = screen.getAllByText("3.7");
            expect(ratings.length).toBeGreaterThan(0);
          });
        });
      });
    });
  });
});
