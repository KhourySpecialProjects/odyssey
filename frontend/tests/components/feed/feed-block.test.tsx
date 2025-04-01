import { render, screen } from "@testing-library/react";
import { FeedBlock } from "@/components/feed/feed-block";
import {
  Announcement,
  DropletStatus,
  DropletType,
  FocusArea,
  Tag,
  TimeZone,
} from "@/types";

describe("FeedBlock", () => {
  const mockDroplet = {
    id: 1,
    name: "Test Droplet",
    slug: "test-droplet",
    isHidden: false,
    focusArea: "personal" as FocusArea,
    type: "knowledge" as DropletType,
    tags: [{ id: 1, name: "React" }] as Tag[],
    learningObjectives: [],
    status: "published" as DropletStatus,
    droplet_lessons: [],
  };
  const mockAnnouncement = {
    id: 1,
    type: "droplet" as const,
    content: "New droplet available!",
    firstCreated: new Date(),
    droplet: mockDroplet,
  };

  const mockUser = {
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
  };

  it("renders announcement content", () => {
    render(<FeedBlock announcement={mockAnnouncement} authUser={mockUser} />);
    expect(screen.getByText("New droplet available!")).toBeInTheDocument();
  });

  it("formats date correctly", () => {
    render(<FeedBlock announcement={mockAnnouncement} authUser={mockUser} />);
    expect(
      screen.getByText(/\d{1,2}\/\d{1,2}\/\d{4}, \d{1,2}:\d{2} [AP]M/),
    ).toBeInTheDocument();
  });

  it("renders correct background color based on type", () => {
    render(<FeedBlock announcement={mockAnnouncement} authUser={mockUser} />);
    const container = screen.getByRole("listitem");
    expect(container).toHaveClass("bg-sky-200");
  });

  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("formatDate function", () => {
    it("handles invalid date input gracefully", () => {
      const invalidAnnouncement = {
        ...mockAnnouncement,
        firstCreated: "invalid-date" as any,
      } as Announcement;

      render(
        <FeedBlock announcement={invalidAnnouncement} authUser={mockUser} />,
      );

      // Wait for next tick to allow for async operations
      setTimeout(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "Error formatting date:",
          expect.any(Error),
        );
      }, 0);
    });

    it("returns empty string for undefined date", () => {
      const undefinedDateAnnouncement = {
        ...mockAnnouncement,
        firstCreated: undefined as any,
      } as Announcement;

      const { container } = render(
        <FeedBlock
          announcement={undefinedDateAnnouncement}
          authUser={mockUser}
        />,
      );

      expect(container.querySelector(".text-sm.text-slate-500")).toBeNull();
    });

    it("handles null date input gracefully", () => {
      const nullDateAnnouncement = {
        ...mockAnnouncement,
        firstCreated: null as any,
      } as Announcement;

      render(
        <FeedBlock announcement={nullDateAnnouncement} authUser={mockUser} />,
      );

      // Wait for next tick to allow for async operations
      setTimeout(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "Error formatting date:",
          expect.any(Error),
        );
      }, 0);
    });
  });
});
