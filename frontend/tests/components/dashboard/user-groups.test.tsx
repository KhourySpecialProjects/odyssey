import { render, screen } from "@testing-library/react";
import { UserGroups } from "@/components/dashboard/user-groups";
import { SearchProvider } from "@/contexts/SearchContext";
import { GroupSemester, TimeZone } from "@/types";

const mockUser = {
  id: 1,
  email: `user@example.com`,
  isEnabled: true,
  roles: [],
  linkedin: "https://www.google.com/",
  github: "https://www.google.com/",
  firstName: "first",
  lastName: "last",
  bio: "bio",
  firstTime: false,
  friendships: [],
  sent_requests: [],
  received_requests: [],
  profilePhoto: "",
  blocked: [],
  was_blocked: [],
  timeZone: "America/New_York" as TimeZone,
};

const mockGroups = [
  {
    id: 1,
    groupName: "Group A",
    members: [],
    slug: "test-group",
    isArchived: false,
    semester: "Spring 2025" as GroupSemester,
    creator: mockUser,
  },
  {
    id: 2,
    groupName: "Group B",
    members: [],
    slug: "test-group-2",
    isArchived: false,
    semester: "Spring 2025" as GroupSemester,
    creator: mockUser,
  },
];

describe("UserGroups", () => {
  const defaultProps = {
    activeGroups: mockGroups,
    isArchived: false,
  };

  it("renders all groups initially", () => {
    render(
      <SearchProvider>
        <UserGroups {...defaultProps} />
      </SearchProvider>,
    );

    expect(screen.getByText("Group A")).toBeInTheDocument();
    expect(screen.getByText("Group B")).toBeInTheDocument();
  });

  it("sorts groups by name in ascending order", () => {
    render(
      <SearchProvider>
        <UserGroups {...defaultProps} sortKey="name:asc" />
      </SearchProvider>,
    );

    const groups = screen.getAllByText(/Group/);
    expect(groups[0]).toHaveTextContent("Group A");
    expect(groups[1]).toHaveTextContent("Group B");
  });

  it("sorts groups by name in descending order", () => {
    render(
      <SearchProvider>
        <UserGroups {...defaultProps} sortKey="name:desc" />
      </SearchProvider>,
    );

    const groups = screen.getAllByText(/Group/);
    expect(groups[0]).toHaveTextContent("Group B");
    expect(groups[1]).toHaveTextContent("Group A");
  });
});
