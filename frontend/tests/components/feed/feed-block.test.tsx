import { render, screen } from "@testing-library/react";
import { FeedBlock } from "@/components/feed/feed-block";
import {
  AnnouncementType,
  DropletStatus,
  DropletType,
  FocusArea,
  Tag,
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

  it("renders announcement content", () => {
    render(<FeedBlock announcement={mockAnnouncement} />);
    expect(screen.getByText("New droplet available!")).toBeInTheDocument();
  });

  it("formats date correctly", () => {
    render(<FeedBlock announcement={mockAnnouncement} />);
    expect(
      screen.getByText(/\d{1,2}\/\d{1,2}\/\d{4}, \d{1,2}:\d{2} [AP]M/),
    ).toBeInTheDocument();
  });

  it("renders correct background color based on type", () => {
    render(<FeedBlock announcement={mockAnnouncement} />);
    const container = screen.getByRole("listitem");
    expect(container).toHaveClass("bg-sky-200");
  });
});
