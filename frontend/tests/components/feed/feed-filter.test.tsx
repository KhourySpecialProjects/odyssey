import { FeedFilter } from "@/components/feed/feed-filter";
import { AnnouncementTypeTitle } from "@/lib/globals";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

describe("FeedFilter", () => {
  it("renders all role options", () => {
    const mockOnFilterChange = jest.fn();
    render(<FeedFilter onFilterChange={mockOnFilterChange} />);

    expect(screen.getByRole("droplet")).toBeInTheDocument();
    expect(screen.getByRole("playlist")).toBeInTheDocument();
    expect(screen.getByRole("group")).toBeInTheDocument();
  });

  it("calls onFilterChange when a filter is toggled", async () => {
    const mockOnFilterChange = jest.fn();
    render(<FeedFilter onFilterChange={mockOnFilterChange} />);

    await userEvent.click(screen.getByRole("droplet"));
    expect(mockOnFilterChange).toHaveBeenCalled();
  });

  const mockOnFilterChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("toggles role selection correctly", () => {
    render(<FeedFilter onFilterChange={mockOnFilterChange} />);

    const dropletButton = screen.getByRole("droplet").closest("button");
    expect(dropletButton).toHaveClass("opacity-100");

    fireEvent.click(dropletButton!);

    expect(mockOnFilterChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        AnnouncementTypeTitle.Playlist,
        AnnouncementTypeTitle.Group,
        AnnouncementTypeTitle.System,
        AnnouncementTypeTitle.Friend,
        AnnouncementTypeTitle.Kudos,
      ]),
    );
    expect(mockOnFilterChange).toHaveBeenCalledWith(
      expect.not.arrayContaining([AnnouncementTypeTitle.Droplet]),
    );

    expect(dropletButton).toHaveClass("opacity-30");
  });

  it("toggles role selection correctly not selected yet", () => {
    render(<FeedFilter onFilterChange={mockOnFilterChange} />);

    const dropletButton = screen.getByRole("droplet").closest("button");
    expect(dropletButton).toHaveClass("opacity-100");

    fireEvent.click(dropletButton!);

    expect(mockOnFilterChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        AnnouncementTypeTitle.Playlist,
        AnnouncementTypeTitle.Group,
        AnnouncementTypeTitle.System,
        AnnouncementTypeTitle.Friend,
        AnnouncementTypeTitle.Kudos,
      ]),
    );
    expect(mockOnFilterChange).toHaveBeenCalledWith(
      expect.not.arrayContaining([AnnouncementTypeTitle.Droplet]),
    );

    fireEvent.click(dropletButton!);

    expect(mockOnFilterChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        AnnouncementTypeTitle.Playlist,
        AnnouncementTypeTitle.Group,
        AnnouncementTypeTitle.System,
        AnnouncementTypeTitle.Friend,
        AnnouncementTypeTitle.Kudos,
        AnnouncementTypeTitle.Droplet,
      ]),
    );
    expect(mockOnFilterChange).toHaveBeenCalledWith(
      expect.arrayContaining([AnnouncementTypeTitle.Droplet]),
    );

    expect(dropletButton).toHaveClass("opacity-100");
  });

  it("initializes with all roles selected", () => {
    render(<FeedFilter onFilterChange={mockOnFilterChange} />);

    const buttons = screen.getAllByRole("button");
    buttons.forEach((button) => {
      expect(button).toHaveClass("opacity-100");
    });
  });
});
