import { render, screen } from "@testing-library/react";
import { MemberList } from "@/components/group/member-list";
import { AuthorizedUserRoleTitle } from "@/lib/globals";
import { TimeZone } from "@/types";

describe("MemberList", () => {
  const mockUser = {
    id: 1,
    email: "user@example.com",
    firstName: "John",
    lastName: "Doe",
    bio: "Test bio",
    profilePhoto: "https://example.com/photo.jpg",
    isEnabled: true,
    roles: [{ id: 1, title: AuthorizedUserRoleTitle.Faculty }],
    linkedin: "https://www.google.com/",
    github: "https://www.google.com/",
    firstTime: false,
    friendships: [],
    sent_requests: [],
    received_requests: [],
    blocked: [],
    was_blocked: [],
    timeZone: "America/New_York" as TimeZone,
    isPublic: false,
    website: "",
    groups: [],
  };
  const mockMembers = [mockUser];

  it("renders member list with title", () => {
    render(
      <MemberList title="Test Members" members={mockMembers} variant="admin" />,
    );
    expect(screen.getByText("Test Members")).toBeInTheDocument();
    expect(screen.getByText("John Doe")).toBeInTheDocument();
  });

  it("applies correct variant styles", () => {
    render(<MemberList title="Admins" members={mockMembers} variant="admin" />);
    expect(
      screen.getByText("John Doe").parentElement?.parentElement,
    ).toHaveClass("bg-yellow-50");
  });

  it("renders nothing when members array is empty", () => {
    const { container } = render(
      <MemberList title="Empty List" members={[]} variant="admin" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("displays initials when no profile photo", () => {
    render(
      <MemberList title="Members" members={mockMembers} variant="admin" />,
    );
    expect(screen.getByText("JD")).toBeInTheDocument();
  });

  test("displays member name correctly", () => {
    render(
      <MemberList
        title="Test Members"
        members={mockMembers}
        variant="creator"
      />,
    );

    expect(screen.getByText("John Doe")).toBeInTheDocument();
  });
});
