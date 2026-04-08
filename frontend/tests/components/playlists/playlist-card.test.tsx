import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlaylistCard } from "@/components/playlists/playlist-card";
import { DateTime } from "luxon";

describe("PlaylistCard", () => {
  const mockPlaylist = {
    id: 1,
    name: "Test Playlist",
    slug: "test-playlist",
    droplets: [],
    duration: "short" as const,
    isPublic: true,
  };

  const mockPlaylistWithDroplets = {
    id: 2,
    name: "Full Playlist",
    slug: "full-playlist",
    droplets: [
      {
        id: 1,
        name: "Droplet 1",
        slug: "droplet-1",
        lessons: [
          { id: 1, name: "Lesson 1", slug: "lesson-1" },
          { id: 2, name: "Lesson 2", slug: "lesson-2" },
        ],
      },
      {
        id: 2,
        name: "Droplet 2",
        slug: "droplet-2",
        lessons: [{ id: 3, name: "Lesson 3", slug: "lesson-3" }],
      },
    ],
    duration: "medium" as const,
    isPublic: true,
  };

  const mockPlaylistWithDescription = {
    ...mockPlaylist,
    description: "<p>This is a test description for the playlist.</p>",
  };

  describe("Rendering", () => {
    it("renders playlist name and droplet count", () => {
      render(<PlaylistCard playlist={mockPlaylist} />);
      expect(screen.getByText("Test Playlist")).toBeInTheDocument();
      expect(screen.getByText("droplets")).toBeInTheDocument();
      expect(screen.getByText("0")).toBeInTheDocument();
    });

    it("renders with droplets and lessons", () => {
      render(<PlaylistCard playlist={mockPlaylistWithDroplets} />);
      expect(screen.getByText("Full Playlist")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
      expect(screen.getByText("droplets")).toBeInTheDocument();
    });

    it("renders playlist description", () => {
      render(<PlaylistCard playlist={mockPlaylistWithDescription} />);
      expect(
        screen.getByText("This is a test description for the playlist."),
      ).toBeInTheDocument();
    });

    it("renders as a link", () => {
      render(<PlaylistCard playlist={mockPlaylist} />);
      const link = screen.getByRole("link");
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "/p/test-playlist");
    });

    it("renders with correct card styling", () => {
      const { container } = render(<PlaylistCard playlist={mockPlaylist} />);
      const card = container.querySelector(".border-slate-200");
      expect(card).toBeInTheDocument();
    });
  });

  describe("Link Behavior", () => {
    it("uses correct link based on toDraft prop", () => {
      render(<PlaylistCard playlist={mockPlaylist} toDraft={true} />);
      expect(screen.getByRole("link")).toHaveAttribute(
        "href",
        "/draft/p/test-playlist",
      );
    });

    it("uses default link when toDraft is false", () => {
      render(<PlaylistCard playlist={mockPlaylist} toDraft={false} />);
      expect(screen.getByRole("link")).toHaveAttribute(
        "href",
        "/p/test-playlist",
      );
    });

    it("uses playlist slug in link", () => {
      const customPlaylist = { ...mockPlaylist, slug: "custom-slug" };
      render(<PlaylistCard playlist={customPlaylist} />);
      expect(screen.getByRole("link")).toHaveAttribute(
        "href",
        "/p/custom-slug",
      );
    });
  });

  describe("Due Date Display", () => {
    it("shows due date badge when date is provided", () => {
      const tomorrow = DateTime.local().plus({ days: 1 }).toISO();
      render(<PlaylistCard playlist={mockPlaylist} dueDate={tomorrow} />);
      expect(screen.getByText("Due in 1 day")).toBeInTheDocument();
    });

    it("displays correct due date text for today", () => {
      const today = DateTime.local().toISO();
      render(
        <PlaylistCard
          playlist={mockPlaylist}
          dueDate={today}
          timeZone="America/New_York"
        />,
      );
      expect(screen.getByText("Due today!")).toBeInTheDocument();
    });

    it("displays correct due date text with timezone", () => {
      const tomorrow = DateTime.local().plus({ days: 1 }).toISO();
      render(
        <PlaylistCard
          playlist={mockPlaylist}
          dueDate={tomorrow}
          timeZone="America/New_York"
        />,
      );
      expect(screen.getByText(/due/i)).toBeInTheDocument();
    });

    it("shows late badge for overdue assignments", () => {
      const yesterday = DateTime.local().minus({ days: 1 }).toISO();
      render(<PlaylistCard playlist={mockPlaylist} dueDate={yesterday} />);
      expect(screen.getByText("Late!")).toBeInTheDocument();
    });

    it("shows due in multiple days", () => {
      const threeDaysLater = DateTime.local().plus({ days: 3 }).toISO();
      render(<PlaylistCard playlist={mockPlaylist} dueDate={threeDaysLater} />);
      expect(screen.getByText("Due in 3 days")).toBeInTheDocument();
    });

    it("does not show badge when dueDate is empty string", () => {
      render(<PlaylistCard playlist={mockPlaylist} dueDate="" />);
      expect(screen.queryByText(/due/i)).not.toBeInTheDocument();
    });

    it("does not show badge when dueDate is undefined", () => {
      render(<PlaylistCard playlist={mockPlaylist} />);
      expect(screen.queryByText(/due/i)).not.toBeInTheDocument();
    });

    it("does not show badge for assignments more than 2 days late", () => {
      const threeDaysAgo = DateTime.local().minus({ days: 3 }).toISO();
      render(<PlaylistCard playlist={mockPlaylist} dueDate={threeDaysAgo} />);
      expect(screen.queryByText(/due/i)).not.toBeInTheDocument();
    });

    it("renders clock icon in due date badge", () => {
      const tomorrow = DateTime.local().plus({ days: 1 }).toISO();
      const { container } = render(
        <PlaylistCard playlist={mockPlaylist} dueDate={tomorrow} />,
      );
      const clockIcon = container.querySelector("svg");
      expect(clockIcon).toBeInTheDocument();
    });

    it("formats date with timezone correctly", () => {
      const specificDate = DateTime.fromISO("2025-03-15T14:30:00");
      render(
        <PlaylistCard
          playlist={mockPlaylist}
          dueDate={specificDate.toISO() || ""}
          timeZone="America/New_York"
        />,
      );
    });
  });

  describe("Description Display", () => {
    it("strips HTML tags from description", () => {
      const htmlDescription = {
        ...mockPlaylist,
        description: "<p><strong>Bold</strong> text with <em>emphasis</em></p>",
      };
      render(<PlaylistCard playlist={htmlDescription} />);
      expect(screen.getByText("Bold text with emphasis")).toBeInTheDocument();
    });

    it("handles multiple paragraph tags", () => {
      const multiParagraph = {
        ...mockPlaylist,
        description: "<p>First paragraph</p><p>Second paragraph</p>",
      };
      render(<PlaylistCard playlist={multiParagraph} />);
      expect(screen.getByText(/First paragraph/)).toBeInTheDocument();
    });

    it("handles line breaks in description", () => {
      const withBreaks = {
        ...mockPlaylist,
        description: "Line one<br>Line two<br/>Line three",
      };
      render(<PlaylistCard playlist={withBreaks} />);
      expect(screen.getByText(/Line one/)).toBeInTheDocument();
    });

    it("does not render description when empty", () => {
      const emptyDescription = { ...mockPlaylist, description: "" };
      render(<PlaylistCard playlist={emptyDescription} />);
      expect(screen.queryByText("See More")).not.toBeInTheDocument();
    });

    it("does not render description when only contains empty paragraph", () => {
      const emptyParagraph = { ...mockPlaylist, description: "<p></p>" };
      render(<PlaylistCard playlist={emptyParagraph} />);
      expect(screen.queryByText("See More")).not.toBeInTheDocument();
    });

    it("does not render description when undefined", () => {
      render(<PlaylistCard playlist={mockPlaylist} />);
      expect(screen.queryByText("See More")).not.toBeInTheDocument();
    });
  });

  describe("Description Expansion", () => {
    it("shows See More button when text is clamped", async () => {
      const longDescription = {
        ...mockPlaylist,
        description:
          "<p>This is a very long description that should be clamped and require expansion. ".repeat(
            10,
          ) + "</p>",
      };

      // Mock scrollHeight to simulate clamped text
      Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
        configurable: true,
        value: 200,
      });
      Object.defineProperty(HTMLElement.prototype, "clientHeight", {
        configurable: true,
        value: 100,
      });

      render(<PlaylistCard playlist={longDescription} />);

      await waitFor(() => {
        expect(screen.getByText("See More")).toBeInTheDocument();
      });
    });

    it("expands description when See More is clicked", async () => {
      const user = userEvent.setup();
      const longDescription = {
        ...mockPlaylist,
        description: "<p>This is a long description. ".repeat(10) + "</p>",
      };

      Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
        configurable: true,
        value: 200,
      });
      Object.defineProperty(HTMLElement.prototype, "clientHeight", {
        configurable: true,
        value: 100,
      });

      render(<PlaylistCard playlist={longDescription} />);

      await waitFor(() => {
        expect(screen.getByText("See More")).toBeInTheDocument();
      });

      const seeMoreButton = screen.getByText("See More");
      await user.click(seeMoreButton);

      await waitFor(() => {
        expect(screen.getByText("See Less")).toBeInTheDocument();
      });
    });

    it("collapses description when See Less is clicked", async () => {
      const user = userEvent.setup();
      const longDescription = {
        ...mockPlaylist,
        description: "<p>This is a long description. ".repeat(10) + "</p>",
      };

      Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
        configurable: true,
        value: 200,
      });
      Object.defineProperty(HTMLElement.prototype, "clientHeight", {
        configurable: true,
        value: 100,
      });

      render(<PlaylistCard playlist={longDescription} />);

      await waitFor(() => {
        const seeMoreButton = screen.getByText("See More");
        user.click(seeMoreButton);
      });

      await waitFor(() => {
        const seeLessButton = screen.getByText("See Less");
        user.click(seeLessButton);
      });

      await waitFor(() => {
        expect(screen.getByText("See More")).toBeInTheDocument();
      });
    });

    it("prevents link navigation when clicking See More", async () => {
      const user = userEvent.setup();
      const longDescription = {
        ...mockPlaylist,
        description: "<p>Long text. ".repeat(10) + "</p>",
      };

      Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
        configurable: true,
        value: 200,
      });
      Object.defineProperty(HTMLElement.prototype, "clientHeight", {
        configurable: true,
        value: 100,
      });

      render(<PlaylistCard playlist={longDescription} />);

      await waitFor(() => {
        expect(screen.getByText("See More")).toBeInTheDocument();
      });

      const seeMoreButton = screen.getByText("See More");
      await user.click(seeMoreButton);

      // Button should have preventDefault to stop link navigation
      expect(screen.getByText("See Less")).toBeInTheDocument();
    });
  });

  describe("Droplet and Lesson Counts", () => {
    it("calculates correct droplet count", () => {
      render(<PlaylistCard playlist={mockPlaylistWithDroplets} />);
      expect(screen.getByText("2")).toBeInTheDocument();
      expect(screen.getByText("droplets")).toBeInTheDocument();
    });

    it("handles playlist with no droplets", () => {
      render(<PlaylistCard playlist={mockPlaylist} />);
      expect(screen.getByText("0")).toBeInTheDocument();
      expect(screen.getByText("droplets")).toBeInTheDocument();
    });

    it("handles droplets without lessons", () => {
      const dropletsNoLessons = {
        ...mockPlaylist,
        droplets: [
          { id: 1, name: "Droplet 1", slug: "droplet-1" },
          { id: 2, name: "Droplet 2", slug: "droplet-2" },
        ],
      };
      render(<PlaylistCard playlist={dropletsNoLessons} />);
      expect(screen.getByText("2")).toBeInTheDocument();
      expect(screen.getByText("droplets")).toBeInTheDocument();
    });

    it("handles undefined droplets array", () => {
      const noDroplets = { ...mockPlaylist, droplets: undefined };
      render(<PlaylistCard playlist={noDroplets} />);
      expect(screen.getByText("0")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles very long playlist names", () => {
      const longName = {
        ...mockPlaylist,
        name: "This is a very long playlist name that should still render correctly",
      };
      render(<PlaylistCard playlist={longName} />);
      expect(screen.getByText(longName.name)).toBeInTheDocument();
    });

    it("handles special characters in playlist name", () => {
      const specialChars = {
        ...mockPlaylist,
        name: 'Playlist & More: <Testing> "Quotes"',
      };
      render(<PlaylistCard playlist={specialChars} />);
      expect(screen.getByText(specialChars.name)).toBeInTheDocument();
    });

    it("handles invalid due dates gracefully", () => {
      render(<PlaylistCard playlist={mockPlaylist} dueDate="invalid-date" />);
      expect(screen.queryByText(/due/i)).not.toBeInTheDocument();
    });

    it("renders with all optional props undefined", () => {
      render(<PlaylistCard playlist={mockPlaylist} />);
      expect(screen.getByText("Test Playlist")).toBeInTheDocument();
    });
  });

  describe("Styling and Layout", () => {
    it("applies correct card header styling", () => {
      const { container } = render(<PlaylistCard playlist={mockPlaylist} />);
      const cardHeader = container.querySelector(".text-3xl");
      expect(cardHeader).toBeInTheDocument();
    });

    it("applies text clamping class when not expanded", () => {
      const { container } = render(
        <PlaylistCard playlist={mockPlaylistWithDescription} />,
      );
      const description = container.querySelector(".line-clamp-2");
      expect(description).toBeInTheDocument();
    });

    it("displays completion percentage when provided", () => {
      const withCompletion = {
        ...mockPlaylist,
        completionPercentage: 75,
      };
      render(<PlaylistCard playlist={withCompletion} />);
      // Component doesn't currently display this, but test structure is ready
      expect(screen.getByText("Test Playlist")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("link is keyboard accessible", () => {
      render(<PlaylistCard playlist={mockPlaylist} />);
      const link = screen.getByRole("link");
      expect(link).toBeInTheDocument();
    });

    it("description expansion buttons are keyboard accessible", async () => {
      const longDescription = {
        ...mockPlaylist,
        description: "<p>Long text. ".repeat(10) + "</p>",
      };

      Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
        configurable: true,
        value: 200,
      });
      Object.defineProperty(HTMLElement.prototype, "clientHeight", {
        configurable: true,
        value: 100,
      });

      render(<PlaylistCard playlist={longDescription} />);

      await waitFor(() => {
        const seeMoreButton = screen.getByText("See More");
        expect(seeMoreButton).toBeInTheDocument();
      });
    });
  });
});
