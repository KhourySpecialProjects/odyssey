import { render, screen } from "@testing-library/react";
import { FeedFilter } from "@/components/feed/feed-filter";
import { AnnouncementTypeTitle } from "@/lib/globals";

describe("FeedFilter", () => {
  const mockOnFilterChange = jest.fn();

  beforeEach(() => {
    mockOnFilterChange.mockClear();
  });

  it("renders all announcement type filters", () => {
    render(<FeedFilter onFilterChange={mockOnFilterChange} />);

    expect(screen.getByRole("droplet")).toBeInTheDocument();
    expect(screen.getByRole("playlist")).toBeInTheDocument();
    expect(screen.getByRole("group")).toBeInTheDocument();
    expect(screen.getByRole("system")).toBeInTheDocument();
    expect(screen.getByRole("friend")).toBeInTheDocument();
    expect(screen.getByRole("kudos")).toBeInTheDocument();
  });

  it("applies correct styling based on filter state", () => {
    render(<FeedFilter onFilterChange={mockOnFilterChange} />);

    const filterContainers = screen
      .getAllByRole("checkbox")
      .map((checkbox) =>
        checkbox.closest(
          "div[class*='flex items-center space-x-2 rounded-md p-1']",
        ),
      );

    filterContainers.forEach((container, index) => {
      const type = Object.values(AnnouncementTypeTitle)[index];
      switch (type) {
        case AnnouncementTypeTitle.Droplet:
          expect(container).toHaveClass("bg-blue-200");
          break;
        case AnnouncementTypeTitle.Playlist:
          expect(container).toHaveClass("bg-green-200");
          break;
        case AnnouncementTypeTitle.Group:
          expect(container).toHaveClass("bg-purple-200");
          break;
        case AnnouncementTypeTitle.System:
          expect(container).toHaveClass("bg-red-200");
          break;
        case AnnouncementTypeTitle.Friend:
          expect(container).toHaveClass("bg-yellow-200");
          break;
        case AnnouncementTypeTitle.Kudos:
          expect(container).toHaveClass("bg-orange-200");
          break;
      }
    });
  });
});
