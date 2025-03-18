import { FeedFilter } from "@/components/feed/feed-filter";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

describe("FeedFilter", () => {
  it("renders all role options", () => {
    const mockOnFilterChange = jest.fn();
    render(<FeedFilter onFilterChange={mockOnFilterChange} />);

    expect(screen.getByLabelText("Droplet")).toBeInTheDocument();
    expect(screen.getByLabelText("Playlist")).toBeInTheDocument();
    expect(screen.getByLabelText("Group")).toBeInTheDocument();
  });

  it("calls onFilterChange when a filter is toggled", async () => {
    const mockOnFilterChange = jest.fn();
    render(<FeedFilter onFilterChange={mockOnFilterChange} />);

    await userEvent.click(screen.getByLabelText("Droplet"));
    expect(mockOnFilterChange).toHaveBeenCalled();
  });
});
