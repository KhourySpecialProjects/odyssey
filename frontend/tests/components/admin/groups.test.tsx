import { render, screen } from "@testing-library/react";
import { Groups } from "@/components/admin/groups/groups";
import { fetchGroups } from "@/lib/requests/data";

jest.mock("@/lib/requests/data", () => ({
  fetchGroups: jest.fn(),
}));

jest.mock("@/components/admin/groups/create-group", () => ({
  CreateGroup: () => <div data-testid="create-group">Create Group Button</div>,
}));

jest.mock("@/components/admin/groups/group-client", () => ({
  GroupClient: ({ groups }: { groups: any[] }) => (
    <div data-testid="group-client">
      Group Client with {groups.length} groups
    </div>
  ),
}));

describe("Groups", () => {
  const mockGroups = [
    {
      id: 1,
      groupName: "Test Group",
      slug: "test-group",
      isArchived: false,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (fetchGroups as jest.Mock).mockResolvedValue(mockGroups);
  });

  it("renders the component with correct heading", async () => {
    render(await Groups());

    expect(screen.getByText("Groups")).toBeInTheDocument();
    expect(
      screen.getByText("The following groups have been created."),
    ).toBeInTheDocument();
  });

  it("includes the CreateGroup component", async () => {
    render(await Groups());

    expect(screen.getByTestId("create-group")).toBeInTheDocument();
  });

  it("passes fetched groups to GroupClient", async () => {
    render(await Groups());

    expect(screen.getByTestId("group-client")).toBeInTheDocument();
    expect(screen.getByText("Group Client with 1 groups")).toBeInTheDocument();
  });

  it("calls fetchGroups to get data", async () => {
    render(await Groups());

    expect(fetchGroups).toHaveBeenCalledTimes(1);
  });
});
