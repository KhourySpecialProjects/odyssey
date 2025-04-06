import { render, screen } from "@testing-library/react";
import { GroupCard } from "@/components/group/group-card";
import { GroupSemester } from "@/types";

describe("GroupCard", () => {
  const mockUser = {
    id: 5,
    firstName: "Test",
    lastName: "User",
    email: "test.user@northeastern.edu",
  };

  const mockGroup = {
    id: 1,
    groupName: "Test Group",
    slug: "test-group",
    isArchived: false,
    semester: "SPRING" as GroupSemester,
    creator: mockUser,
  };

  const mockRoleColors = {
    admin: "bg-yellow-100",
    manager: "bg-blue-100",
    member: "bg-gray-100",
  };

  it("renders group name", () => {
    render(
      <GroupCard
        group={mockGroup}
        role="admin"
        roleColors={mockRoleColors}
        isArchived={false}
      />,
    );
    expect(screen.getByText("Test Group")).toBeInTheDocument();
  });

  it("shows member counts for admin role", () => {
    render(
      <GroupCard
        group={mockGroup}
        role="admin"
        roleColors={mockRoleColors}
        isArchived={false}
      />,
    );
    expect(screen.getByText("Admins: 0")).toBeInTheDocument();
    expect(screen.getByText("Managers: 0")).toBeInTheDocument();
    expect(screen.getByText("Members: 0")).toBeInTheDocument();
  });

  it("applies correct role color", () => {
    render(
      <GroupCard
        group={mockGroup}
        role="admin"
        roleColors={mockRoleColors}
        isArchived={false}
      />,
    );
    expect(screen.getByText("admin")).toHaveClass("bg-yellow-100");
  });

  test("displays member counts for admin roles correctly", () => {
    render(
      <GroupCard
        group={mockGroup}
        role="admin"
        roleColors={mockRoleColors}
        isArchived={false}
      />,
    );

    expect(screen.getByText("Admins: 0")).toBeInTheDocument();
    expect(screen.getByText("Managers: 0")).toBeInTheDocument();
    expect(screen.getByText("Members: 0")).toBeInTheDocument();
  });

  test("does not show member counts for regular members", () => {
    render(
      <GroupCard
        group={mockGroup}
        role="member"
        roleColors={mockRoleColors}
        isArchived={false}
      />,
    );

    expect(screen.queryByText("Admins:")).not.toBeInTheDocument();
    expect(screen.queryByText("Managers:")).not.toBeInTheDocument();
    expect(screen.queryByText("Members:")).not.toBeInTheDocument();
  });
});
