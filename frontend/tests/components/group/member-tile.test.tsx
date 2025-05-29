import { render, screen, fireEvent } from "@testing-library/react";
import { MemberTile } from "@/components/group/member-tile";

describe("MemberTile", () => {
  const mockMember = {
    email: "john.doe@example.com",
    roles: [],
    isActive: true,
  };

  it("renders member email and role", () => {
    render(<MemberTile member={mockMember} />);
    expect(screen.getByText("john.doe@example.com")).toBeInTheDocument();
  });

  it("shows remove button on hover", () => {
    const onRemove = jest.fn();
    render(<MemberTile member={mockMember} onRemove={onRemove} />);

    const removeButton = screen.getByRole("button");
    fireEvent.click(removeButton);

    expect(onRemove).toHaveBeenCalledWith("john.doe@example.com");
  });

  it("displays correct initials in avatar", () => {
    render(<MemberTile member={mockMember} />);
    expect(screen.getByText("JD")).toBeInTheDocument();
  });

  test("generates correct initials from email", () => {
    render(<MemberTile member={mockMember} />);
    expect(screen.getByText("JD")).toBeInTheDocument();
  });

  test("calls onRemove with correct email when remove button is clicked", () => {
    const mockOnRemove = jest.fn();
    render(<MemberTile member={mockMember} onRemove={mockOnRemove} />);

    const removeButton = screen.getByRole("button");
    fireEvent.click(removeButton);

    expect(mockOnRemove).toHaveBeenCalledWith("john.doe@example.com");
  });
});
