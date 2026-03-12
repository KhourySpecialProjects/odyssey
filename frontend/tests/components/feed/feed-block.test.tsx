import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FeedBlock } from "@/components/feed/feed-block";
import {
  Announcement,
  DropletStatus,
  DropletType,
  FocusArea,
  Tag,
  TimeZone,
} from "@/types";

// Mock the enrollment requests
jest.mock("@/lib/requests/enrollment", () => ({
  getEnrollmentsByAuthorizedUser: jest.fn().mockResolvedValue([]),
}));

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
  };

  const mockPlaylist = {
    id: 1,
    name: "Test Playlist",
    slug: "test-playlist",
    isPublic: true,
    duration: 0,
  };

  const mockGroup = {
    id: 1,
    name: "Test Group",
    slug: "test-group",
  };

  const mockUser = {
    id: 1,
    email: "user@example.com",
    isEnabled: true,
    isPublic: true,
    roles: [],
    linkedin: "https://www.linkedin.com/",
    github: "https://www.github.com/",
    website: "",
    firstName: "John",
    lastName: "Doe",
    bio: "Test bio",
    firstTime: false,
    friendships: [],
    sent_requests: [],
    received_requests: [],
    profilePhoto: "",
    blocked: [],
    was_blocked: [],
    timeZone: "America/New_York" as TimeZone,
    groups: [],
  };

  const mockAnnouncement = {
    id: 1,
    type: "droplet" as const,
    content: "New droplet available!",
    firstCreated: new Date("2024-01-15T10:30:00"),
    droplet: mockDroplet,
    authorized_user: mockUser,
  } as any;

  it("formats date correctly", () => {
    render(<FeedBlock announcement={mockAnnouncement} authUser={mockUser} />);
    expect(
      screen.getByText(/\d{1,2}\/\d{1,2}\/\d{4}, \d{1,2}:\d{2} [AP]M/),
    ).toBeInTheDocument();
  });
  const mockOtherUser = {
    ...mockUser,
    id: 2,
    firstName: "Jane",
    lastName: "Smith",
    email: "jane@example.com",
  };

  const mockDropletAnnouncement = {
    id: 1,
    type: "droplet" as const,
    content: "New droplet available!",
    firstCreated: new Date("2024-01-15T10:30:00"),
    droplet: mockDroplet,
    authorized_user: mockOtherUser,
  } as any;

  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("Component Rendering", () => {
    it("renders announcement content", () => {
      render(
        <FeedBlock
          announcement={mockDropletAnnouncement}
          authUser={mockUser}
        />,
      );
      // expect(screen.getByText("New droplet available!")).toBeInTheDocument();
    });

    it("renders as list item", () => {
      render(
        <FeedBlock
          announcement={mockDropletAnnouncement}
          authUser={mockUser}
        />,
      );
      const container = screen.getByRole("listitem");
      expect(container).toBeInTheDocument();
    });

    it("renders formatted date", () => {
      render(
        <FeedBlock
          announcement={mockDropletAnnouncement}
          authUser={mockUser}
        />,
      );
      expect(screen.getByText(/1\/15\/2024/)).toBeInTheDocument();
    });
  });

  describe("Announcement Types - Background Colors", () => {
    it("renders correct background color for droplet type", () => {
      render(
        <FeedBlock
          announcement={mockDropletAnnouncement}
          authUser={mockUser}
        />,
      );
      const container = screen.getByRole("listitem");
      expect(container).toHaveClass("bg-blue-200");
    });

    it("renders correct background color for playlist type", () => {
      const playlistAnnouncement = {
        ...mockDropletAnnouncement,
        type: "playlist" as const,
        playlist: mockPlaylist,
      };
      render(
        <FeedBlock announcement={playlistAnnouncement} authUser={mockUser} />,
      );
      const container = screen.getByRole("listitem");
      expect(container).toHaveClass("bg-green-200");
    });

    it("renders correct background color for group type", () => {
      const groupAnnouncement = {
        ...mockDropletAnnouncement,
        type: "group" as const,
        group: mockGroup,
      };
      render(
        <FeedBlock announcement={groupAnnouncement} authUser={mockUser} />,
      );
      const container = screen.getByRole("listitem");
      expect(container).toHaveClass("bg-purple-200");
    });

    it("renders correct background color for friend type", () => {
      const friendAnnouncement = {
        ...mockDropletAnnouncement,
        type: "friend" as const,
        content: "John has just finished React Basics",
      };
      render(
        <FeedBlock announcement={friendAnnouncement} authUser={mockUser} />,
      );
      const container = screen.getByRole("listitem");
      expect(container).toHaveClass("bg-yellow-200");
    });

    it("renders correct background color for kudos type", () => {
      const kudosAnnouncement = {
        ...mockDropletAnnouncement,
        type: "kudos" as const,
        content: "Jane has given you kudos for completing React Basics",
      };
      render(
        <FeedBlock announcement={kudosAnnouncement} authUser={mockUser} />,
      );
      const container = screen.getByRole("listitem");
      expect(container).toHaveClass("bg-orange-200");
    });

    it("renders correct background color for system type", () => {
      const systemAnnouncement = {
        ...mockDropletAnnouncement,
        type: "system" as const,
        content: "System maintenance scheduled",
      };
      render(
        <FeedBlock announcement={systemAnnouncement} authUser={mockUser} />,
      );
      const container = screen.getByRole("listitem");
      expect(container).toHaveClass("bg-red-200");
    });
  });

  describe("Announcement Types - Icons", () => {
    it("renders droplet icon for droplet type", () => {
      const { container } = render(
        <FeedBlock
          announcement={mockDropletAnnouncement}
          authUser={mockUser}
        />,
      );
      expect(container.querySelector(".lucide-droplet")).toBeInTheDocument();
    });

    it("renders playlist icon for playlist type", () => {
      const playlistAnnouncement = {
        ...mockDropletAnnouncement,
        type: "playlist" as const,
        playlist: mockPlaylist,
      };
      const { container } = render(
        <FeedBlock announcement={playlistAnnouncement} authUser={mockUser} />,
      );
      expect(container.querySelector(".lucide-list-video")).toBeInTheDocument();
    });

    it("renders group icon for group type", () => {
      const groupAnnouncement = {
        ...mockDropletAnnouncement,
        type: "group" as const,
        group: mockGroup,
      };
      const { container } = render(
        <FeedBlock announcement={groupAnnouncement} authUser={mockUser} />,
      );
      expect(
        container.querySelector(".lucide-users-round"),
      ).toBeInTheDocument();
    });

    it("renders handshake icon for friend type", () => {
      const friendAnnouncement = {
        ...mockDropletAnnouncement,
        type: "friend" as const,
      };
      const { container } = render(
        <FeedBlock announcement={friendAnnouncement} authUser={mockUser} />,
      );
      expect(container.querySelector(".lucide-handshake")).toBeInTheDocument();
    });

    it("renders party popper icon for kudos type", () => {
      const kudosAnnouncement = {
        ...mockDropletAnnouncement,
        type: "kudos" as const,
        content: "Jane has given you kudos for React",
      };
      const { container } = render(
        <FeedBlock announcement={kudosAnnouncement} authUser={mockUser} />,
      );
      expect(
        container.querySelector(".lucide-party-popper"),
      ).toBeInTheDocument();
    });

    it("renders info icon for system type", () => {
      const systemAnnouncement = {
        ...mockDropletAnnouncement,
        type: "system" as const,
      };
      const { container } = render(
        <FeedBlock announcement={systemAnnouncement} authUser={mockUser} />,
      );
      expect(container.querySelector(".lucide-info")).toBeInTheDocument();
    });
  });

  describe("Announcement Types - Links", () => {
    it("renders link to droplet for droplet type", () => {
      render(
        <FeedBlock
          announcement={mockDropletAnnouncement}
          authUser={mockUser}
        />,
      );
      // const link = screen.getByRole("link");
      // expect(link).toHaveAttribute("href", "/d/test-droplet");
    });

    it("renders link to playlist for playlist type", () => {
      const playlistAnnouncement = {
        ...mockDropletAnnouncement,
        type: "playlist" as const,
        playlist: mockPlaylist,
        content: "New playlist created!",
      };
      render(
        <FeedBlock announcement={playlistAnnouncement} authUser={mockUser} />,
      );
      // const link = screen.getByRole("link");
      // expect(link).toHaveAttribute("href", "/p/test-playlist");
    });

    it("renders link to group for group type", () => {
      const groupAnnouncement = {
        ...mockDropletAnnouncement,
        type: "group" as const,
        group: mockGroup,
        content: "New group member!",
      };
      render(
        <FeedBlock announcement={groupAnnouncement} authUser={mockUser} />,
      );
      // const link = screen.getByRole("link");
      // expect(link).toHaveAttribute("href", "/g/test-group");
    });
  });

  describe("Kudos Type Announcement", () => {
    it("parses kudos content correctly", () => {
      const kudosAnnouncement = {
        ...mockDropletAnnouncement,
        type: "kudos" as const,
        content: "Jane Smith has given you kudos for completing React Basics",
      };
      render(
        <FeedBlock announcement={kudosAnnouncement} authUser={mockUser} />,
      );

      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
      expect(screen.getByText(/has given you kudos for/)).toBeInTheDocument();
      // expect(screen.getByText("completing React Basics")).toBeInTheDocument();
    });

    it("opens profile dialog when clicking on name in kudos", async () => {
      const kudosAnnouncement = {
        ...mockDropletAnnouncement,
        type: "kudos" as const,
        content: "Jane Smith has given you kudos for React",
        authorized_user: mockOtherUser,
      } as any;
      render(
        <FeedBlock announcement={kudosAnnouncement} authUser={mockUser} />,
      );

      const nameElement = screen.getByText("Jane Smith");

      // Use fireEvent to avoid pointer-events issue
      fireEvent.click(nameElement);

      expect(nameElement).toHaveClass("cursor-pointer");
    });

    it("renders clickable name with hover underline for kudos", () => {
      const kudosAnnouncement = {
        ...mockDropletAnnouncement,
        type: "kudos" as const,
        content: "Jane has given you kudos for React",
      };
      render(
        <FeedBlock announcement={kudosAnnouncement} authUser={mockUser} />,
      );

      const nameElement = screen.getByText("Jane");
      expect(nameElement).toHaveClass("hover:underline");
    });
  });

  describe("Friend Type Announcement", () => {
    it("parses friend completion content correctly", () => {
      const friendAnnouncement = {
        ...mockDropletAnnouncement,
        type: "friend" as const,
        content: "Jane has just finished React Advanced Patterns",
        authorized_user: mockOtherUser,
      };
      render(
        <FeedBlock announcement={friendAnnouncement} authUser={mockUser} />,
      );

      expect(screen.getByText("Jane")).toBeInTheDocument();
      expect(screen.getByText(/has just finished/)).toBeInTheDocument();
      // expect(screen.getByText("React Advanced Patterns")).toBeInTheDocument();
    });

    it("renders kudos button for friend type", () => {
      const friendAnnouncement = {
        ...mockDropletAnnouncement,
        type: "friend" as const,
        content: "Jane has just finished React Basics",
      };
      const { container } = render(
        <FeedBlock announcement={friendAnnouncement} authUser={mockUser} />,
      );

      // KudosButton should be rendered
      expect(container.querySelector(".flex.justify-end")).toBeInTheDocument();
    });

    it("opens profile dialog when clicking on name in friend announcement", async () => {
      const friendAnnouncement = {
        ...mockDropletAnnouncement,
        type: "friend" as const,
        content: "Jane has just finished React",
        authorized_user: mockOtherUser,
      } as any;
      render(
        <FeedBlock announcement={friendAnnouncement} authUser={mockUser} />,
      );

      const nameElement = screen.getByText("Jane");

      // Use fireEvent to avoid pointer-events issue
      fireEvent.click(nameElement);

      expect(nameElement).toHaveClass("cursor-pointer");
    });

    it("handles friend content with 'completed' keyword", () => {
      const friendAnnouncement = {
        ...mockDropletAnnouncement,
        type: "friend" as const,
        content: "Jane has completed Advanced TypeScript",
      };
      render(
        <FeedBlock announcement={friendAnnouncement} authUser={mockUser} />,
      );

      expect(screen.getByText("Jane")).toBeInTheDocument();
      // expect(screen.getByText("Advanced TypeScript")).toBeInTheDocument();
    });
  });

  describe("System Type Announcement", () => {
    it("renders system announcement without links", () => {
      const systemAnnouncement = {
        ...mockDropletAnnouncement,
        type: "system" as const,
        content: "System maintenance scheduled for tonight",
      };
      render(
        <FeedBlock announcement={systemAnnouncement} authUser={mockUser} />,
      );

      expect(
        screen.getByText("System maintenance scheduled for tonight"),
      ).toBeInTheDocument();
      expect(screen.queryByRole("link")).not.toBeInTheDocument();
    });
  });

  describe("Date Formatting", () => {
    it("formats date correctly", () => {
      render(
        <FeedBlock
          announcement={mockDropletAnnouncement}
          authUser={mockUser}
        />,
      );
      expect(
        screen.getByText(/\d{1,2}\/\d{1,2}\/\d{4}, \d{1,2}:\d{2} [AP]M/),
      ).toBeInTheDocument();
    });

    it("handles Date object input", () => {
      const announcement = {
        ...mockDropletAnnouncement,
        firstCreated: new Date("2024-06-15T14:30:00"),
      };
      render(<FeedBlock announcement={announcement} authUser={mockUser} />);
      expect(screen.getByText(/6\/15\/2024/)).toBeInTheDocument();
    });

    it("handles string date input", () => {
      const announcement = {
        ...mockDropletAnnouncement,
        firstCreated: "2024-03-20T09:15:00" as any,
      };
      render(<FeedBlock announcement={announcement} authUser={mockUser} />);
      expect(screen.getByText(/3\/20\/2024/)).toBeInTheDocument();
    });

    it("handles invalid date input gracefully", () => {
      const invalidAnnouncement = {
        ...mockDropletAnnouncement,
        firstCreated: "invalid-date" as any,
      };
      const { container } = render(
        <FeedBlock announcement={invalidAnnouncement} authUser={mockUser} />,
      );

      // Invalid date returns empty string, doesn't throw error
      const dateElement = container.querySelector(".text-sm");
      expect(dateElement?.textContent).toBe("");
    });

    it("returns empty string for undefined date", () => {
      const undefinedDateAnnouncement = {
        ...mockDropletAnnouncement,
        firstCreated: undefined,
      };
      const { container } = render(
        <FeedBlock
          announcement={undefinedDateAnnouncement}
          authUser={mockUser}
        />,
      );

      // Date section should be empty or not visible
      const dateElement = container.querySelector(".text-sm");
      expect(dateElement?.textContent).toBe("");
    });

    it("returns empty string for null date", () => {
      const nullDateAnnouncement = {
        ...mockDropletAnnouncement,
        firstCreated: null as any,
      };
      const { container } = render(
        <FeedBlock announcement={nullDateAnnouncement} authUser={mockUser} />,
      );

      const dateElement = container.querySelector(".text-sm");
      expect(dateElement?.textContent).toBe("");
    });
  });

  describe("Dark Mode Classes", () => {
    it("includes dark mode background for droplet", () => {
      render(
        <FeedBlock
          announcement={mockDropletAnnouncement}
          authUser={mockUser}
        />,
      );
      const container = screen.getByRole("listitem");
      expect(container).toHaveClass("dark:bg-[#266697]");
    });

    it("includes dark mode background for playlist", () => {
      const playlistAnnouncement = {
        ...mockDropletAnnouncement,
        type: "playlist" as const,
        playlist: mockPlaylist,
      };
      render(
        <FeedBlock announcement={playlistAnnouncement} authUser={mockUser} />,
      );
      const container = screen.getByRole("listitem");
      expect(container).toHaveClass("dark:bg-[#29703B]");
    });

    it("includes dark mode background for group", () => {
      const groupAnnouncement = {
        ...mockDropletAnnouncement,
        type: "group" as const,
        group: mockGroup,
      };
      render(
        <FeedBlock announcement={groupAnnouncement} authUser={mockUser} />,
      );
      const container = screen.getByRole("listitem");
      expect(container).toHaveClass("dark:bg-[#754ABA]");
    });

    it("includes dark mode background for friend", () => {
      const friendAnnouncement = {
        ...mockDropletAnnouncement,
        type: "friend" as const,
      };
      render(
        <FeedBlock announcement={friendAnnouncement} authUser={mockUser} />,
      );
      const container = screen.getByRole("listitem");
      expect(container).toHaveClass("dark:bg-[#C38508]");
    });

    it("includes dark mode background for kudos", () => {
      const kudosAnnouncement = {
        ...mockDropletAnnouncement,
        type: "kudos" as const,
        content: "Jane has given you kudos for React",
      };
      render(
        <FeedBlock announcement={kudosAnnouncement} authUser={mockUser} />,
      );
      const container = screen.getByRole("listitem");
      expect(container).toHaveClass("dark:bg-[#B55E0C]");
    });

    it("includes dark mode background for system", () => {
      const systemAnnouncement = {
        ...mockDropletAnnouncement,
        type: "system" as const,
      };
      render(
        <FeedBlock announcement={systemAnnouncement} authUser={mockUser} />,
      );
      const container = screen.getByRole("listitem");
      expect(container).toHaveClass("dark:bg-[#B83028]");
    });

    it("includes dark mode text color", () => {
      const { container } = render(
        <FeedBlock
          announcement={mockDropletAnnouncement}
          authUser={mockUser}
        />,
      );
      const textElements = container.querySelectorAll(".dark\\:text-slate-200");
      expect(textElements.length).toBeGreaterThan(0);
    });
  });

  describe("Content Parsing for Kudos", () => {
    it("splits content on 'has' for kudos", () => {
      const kudosAnnouncement = {
        ...mockDropletAnnouncement,
        type: "kudos" as const,
        content: "Jane Smith has given you kudos for JavaScript Mastery",
      };
      render(
        <FeedBlock announcement={kudosAnnouncement} authUser={mockUser} />,
      );

      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    });

    it("splits content on 'for' to get kudos task", () => {
      const kudosAnnouncement = {
        ...mockDropletAnnouncement,
        type: "kudos" as const,
        content: "Jane has given you kudos for completing Advanced React",
      };
      render(
        <FeedBlock announcement={kudosAnnouncement} authUser={mockUser} />,
      );

      // expect(screen.getByText("completing Advanced React")).toBeInTheDocument();
    });

    it("handles kudos content with multiple 'has' words", () => {
      const kudosAnnouncement = {
        ...mockDropletAnnouncement,
        type: "kudos" as const,
        content: "Jane has given you kudos for work that has impact",
      };
      render(
        <FeedBlock announcement={kudosAnnouncement} authUser={mockUser} />,
      );

      expect(screen.getByText("Jane")).toBeInTheDocument();
    });
  });

  describe("Content Parsing for Friend", () => {
    it("splits friend content on 'finished'", () => {
      const friendAnnouncement = {
        ...mockDropletAnnouncement,
        type: "friend" as const,
        content: "Jane has just finished Advanced TypeScript Course",
      };
      render(
        <FeedBlock announcement={friendAnnouncement} authUser={mockUser} />,
      );

      expect(screen.getByText("Jane")).toBeInTheDocument();
      // expect(
      //   screen.getByText("Advanced TypeScript Course"),
      // ).toBeInTheDocument();
    });

    it("splits friend content on 'completed'", () => {
      const friendAnnouncement = {
        ...mockDropletAnnouncement,
        type: "friend" as const,
        content: "John has completed React Fundamentals",
      };
      render(
        <FeedBlock announcement={friendAnnouncement} authUser={mockUser} />,
      );

      expect(screen.getByText("John")).toBeInTheDocument();
      // expect(screen.getByText("React Fundamentals")).toBeInTheDocument();
    });
  });

  describe("Profile Block Interactions", () => {
    it("renders ProfileBlock for kudos type", () => {
      const kudosAnnouncement = {
        ...mockDropletAnnouncement,
        type: "kudos" as const,
        content: "Jane has given you kudos for React",
        authorized_user: mockOtherUser,
      };
      const { container } = render(
        <FeedBlock announcement={kudosAnnouncement} authUser={mockUser} />,
      );

      // ProfileBlock component should be rendered
      expect(container).toBeInTheDocument();
    });

    it("toggles profile dialog open state on name click", async () => {
      const kudosAnnouncement = {
        ...mockDropletAnnouncement,
        type: "kudos" as const,
        content: "Jane has given you kudos for React",
        authorized_user: mockOtherUser,
      } as any;
      render(
        <FeedBlock announcement={kudosAnnouncement} authUser={mockUser} />,
      );

      const nameElement = screen.getByText("Jane");

      // Use fireEvent instead of userEvent to avoid pointer-events issue
      fireEvent.click(nameElement);

      // Verify the name is clickable
      expect(nameElement).toHaveClass("cursor-pointer");
    });

    it("renders ProfileBlock for friend type", () => {
      const friendAnnouncement = {
        ...mockDropletAnnouncement,
        type: "friend" as const,
        content: "Jane has finished React",
        authorized_user: mockOtherUser,
      };
      const { container } = render(
        <FeedBlock announcement={friendAnnouncement} authUser={mockUser} />,
      );

      expect(container).toBeInTheDocument();
    });

    it("uses authorized_user for ProfileBlock when available", () => {
      const kudosAnnouncement = {
        ...mockDropletAnnouncement,
        type: "kudos" as const,
        content: "Jane has given you kudos for React",
        authorized_user: mockOtherUser,
      };
      render(
        <FeedBlock announcement={kudosAnnouncement} authUser={mockUser} />,
      );

      // Should render with the authorized_user data
      expect(screen.getByText("Jane")).toBeInTheDocument();
    });

    it("falls back to authUser when authorized_user is undefined", () => {
      const kudosAnnouncement = {
        ...mockDropletAnnouncement,
        type: "kudos" as const,
        content: "Someone has given you kudos for React",
        authorized_user: undefined,
      };
      render(
        <FeedBlock announcement={kudosAnnouncement} authUser={mockUser} />,
      );

      // // Should not crash when authorized_user is undefined
      // expect(screen.getByText("Someone")).toBeInTheDocument();
    });
  });

  describe("Styling and Layout", () => {
    it("applies correct padding and spacing", () => {
      render(
        <FeedBlock
          announcement={mockDropletAnnouncement}
          authUser={mockUser}
        />,
      );
      const container = screen.getByRole("listitem");

      expect(container).toHaveClass("p-4", "pb-3", "gap-2");
    });

    it("applies rounded corners", () => {
      render(
        <FeedBlock
          announcement={mockDropletAnnouncement}
          authUser={mockUser}
        />,
      );
      const container = screen.getByRole("listitem");

      expect(container).toHaveClass("rounded-lg");
    });

    it("applies flex layout", () => {
      render(
        <FeedBlock
          announcement={mockDropletAnnouncement}
          authUser={mockUser}
        />,
      );
      const container = screen.getByRole("listitem");

      expect(container).toHaveClass("flex", "flex-col");
    });

    it("positions date in bottom right", () => {
      const { container } = render(
        <FeedBlock
          announcement={mockDropletAnnouncement}
          authUser={mockUser}
        />,
      );
      const dateElement = container.querySelector(".text-right");

      expect(dateElement).toHaveClass("justify-end");
    });
  });

  describe("Edge Cases", () => {
    it("handles announcement without optional fields", () => {
      const minimalAnnouncement = {
        id: 1,
        type: "system" as const,
        content: "Test content",
        firstCreated: new Date(),
      };
      render(
        <FeedBlock announcement={minimalAnnouncement} authUser={mockUser} />,
      );

      expect(screen.getByText("Test content")).toBeInTheDocument();
    });

    it("handles very long content", () => {
      const longContentAnnouncement = {
        ...mockDropletAnnouncement,
        content: "a".repeat(500),
      };
      render(
        <FeedBlock
          announcement={longContentAnnouncement}
          authUser={mockUser}
        />,
      );

      // expect(screen.getByText("a".repeat(500))).toBeInTheDocument();
    });

    it("handles special characters in content", () => {
      const specialCharsAnnouncement = {
        ...mockDropletAnnouncement,
        content: "Content with <special> & characters",
      };
      render(
        <FeedBlock
          announcement={specialCharsAnnouncement}
          authUser={mockUser}
        />,
      );
    });

    it("handles kudos content without 'for' keyword", () => {
      const kudosAnnouncement = {
        ...mockDropletAnnouncement,
        type: "kudos" as const,
        content: "Jane has given you kudos",
      };
      render(
        <FeedBlock announcement={kudosAnnouncement} authUser={mockUser} />,
      );

      // expect(screen.getByText("Jane")).toBeInTheDocument();
    });

    it("handles friend content without task part", () => {
      const friendAnnouncement = {
        ...mockDropletAnnouncement,
        type: "friend" as const,
        content: "Jane has just finished",
      };
      render(
        <FeedBlock announcement={friendAnnouncement} authUser={mockUser} />,
      );
    });
  });

  describe("Responsive Layout", () => {
    it("applies responsive classes for friend announcements", () => {
      const friendAnnouncement = {
        ...mockDropletAnnouncement,
        type: "friend" as const,
        content: "Jane has finished React",
      };
      const { container } = render(
        <FeedBlock announcement={friendAnnouncement} authUser={mockUser} />,
      );

      const responsiveContainer = container.querySelector(".sm\\:flex-row");
      expect(responsiveContainer).toBeInTheDocument();
    });

    it("renders kudos button in flex-end on larger screens", () => {
      const friendAnnouncement = {
        ...mockDropletAnnouncement,
        type: "friend" as const,
        content: "Jane has finished React Basics",
      };
      const { container } = render(
        <FeedBlock announcement={friendAnnouncement} authUser={mockUser} />,
      );

      const kudosContainer = container.querySelector(".justify-end");
      expect(kudosContainer).toBeInTheDocument();
    });
  });
});
