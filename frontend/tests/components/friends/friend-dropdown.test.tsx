import { render, screen, fireEvent } from "@testing-library/react";
import { FriendDropdown } from "@/components/friends/component-dropdown";

describe("FriendDropdown", () => {
  const mockContent = {
    "Option 1": <div>Content 1</div>,
    "Option 2": <div>Content 2</div>,
  };

  it("renders dropdown button", () => {
    render(<FriendDropdown content={mockContent} />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("shows options when clicked", () => {
    render(<FriendDropdown content={mockContent} />);
    fireEvent.click(screen.getByRole("button"));

    expect(screen.getByText("Option 1")).toBeInTheDocument();
    expect(screen.getByText("Option 2")).toBeInTheDocument();
  });

  it("changes content when option is selected", () => {
    render(<FriendDropdown content={mockContent} />);
    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByText("Option 2"));

    expect(screen.getByText("Content 2")).toBeInTheDocument();
  });
});
