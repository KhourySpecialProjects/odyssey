import { render, screen, fireEvent } from "@testing-library/react";
import { FeedClient } from "@/components/feed/feed-client";
import { AnnouncementType } from "@/types";

describe("FeedClient", () => {
  const mockAnnouncements = Array.from({ length: 6 }, (_, i) => ({
    id: i,
    type: "droplet" as const,
    content: `Announcement ${i}`,
    firstCreated: new Date(),
  }));

  it("handles pagination correctly", () => {
    render(
      <FeedClient
        selectedRoles={["droplet"]}
        announcements={mockAnnouncements}
      />,
    );

    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByText("Announcement 5")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Previous"));
    expect(screen.getByText("Announcement 0")).toBeInTheDocument();
  });

  const mockAnnouncements2 = Array.from({ length: 25 }, (_, i) => ({
    id: i + 1,
    type: "playlist" as AnnouncementType,
    content: `Announcement ${i + 1}`,
    firstCreated: new Date(),
    kudosGiven: false,
  }));

  it("handles pagination navigation correctly", () => {
    render(
      <FeedClient
        selectedRoles={["playlist"]}
        announcements={mockAnnouncements2}
      />,
    );

    expect(screen.getAllByText(/Announcement/)).toHaveLength(20);

    fireEvent.click(screen.getByText("Next"));
    expect(screen.getAllByText(/Announcement/)).toHaveLength(5);

    fireEvent.click(screen.getByText("Previous"));
    expect(screen.getAllByText(/Announcement/)).toHaveLength(20);
  });

  it("disables navigation buttons appropriately", () => {
    render(
      <FeedClient
        selectedRoles={["playlist"]}
        announcements={mockAnnouncements2}
      />,
    );

    expect(screen.getByText("Previous")).toHaveClass("visibility: hidden");
    expect(screen.getByText("Next")).not.toHaveClass("visibility: hidden");

    fireEvent.click(screen.getByText("Next"));

    expect(screen.getByText("Next")).toHaveClass("visibility: hidden");
    expect(screen.getByText("Previous")).not.toHaveClass("visibility: hidden");
  });
});
