import { render, screen, fireEvent } from "@testing-library/react";
import { GroupClient } from "@/components/admin/groups/group-client";
import { GroupSemester } from "@/types";

jest.mock("@/components/admin/groups/group-block", () => ({
  GroupBlock: ({ group }: { group: any }) => (
    <div data-testid={`group-${group.id}`}>{group.groupName}</div>
  ),
}));

describe("GroupClient", () => {
  const mockGroups = Array.from({ length: 15 }, (_, i) => ({
    id: i + 1,
    groupName: `Group ${i + 1}`,
    slug: `group-${i + 1}`,
    isArchived: false,
    semester: "SPRING" as GroupSemester,
  }));

  it("renders a list of groups", () => {
    render(<GroupClient groups={mockGroups.slice(0, 5)} />);

    expect(screen.getByTestId("group-1")).toBeInTheDocument();
    expect(screen.getByTestId("group-5")).toBeInTheDocument();
  });

  it("displays pagination correctly", () => {
    render(<GroupClient groups={mockGroups} />);

    expect(screen.getByTestId("group-1")).toBeInTheDocument();
    expect(screen.getByTestId("group-10")).toBeInTheDocument();
    expect(screen.queryByTestId("group-11")).not.toBeInTheDocument();

    expect(screen.getByText("Next")).toBeInTheDocument();
    const prevButton = screen.getByText("Previous");
    expect(prevButton).toBeInTheDocument();
    expect(prevButton).toBeDisabled();
  });

  it("navigates to next page when Next button is clicked", () => {
    render(<GroupClient groups={mockGroups} />);

    fireEvent.click(screen.getByText("Next"));

    expect(screen.queryByTestId("group-1")).not.toBeInTheDocument();
    expect(screen.getByTestId("group-11")).toBeInTheDocument();
    expect(screen.getByTestId("group-15")).toBeInTheDocument();

    expect(screen.getByText("Previous")).toBeInTheDocument();
    const nextButton = screen.getByText("Next");
    expect(nextButton).toBeInTheDocument();
    expect(nextButton).toBeDisabled();
  });

  it("navigates to previous page when Previous button is clicked", () => {
    render(<GroupClient groups={mockGroups} />);

    fireEvent.click(screen.getByText("Next"));

    fireEvent.click(screen.getByText("Previous"));

    expect(screen.getByTestId("group-1")).toBeInTheDocument();
    expect(screen.getByTestId("group-10")).toBeInTheDocument();
    expect(screen.queryByTestId("group-11")).not.toBeInTheDocument();
  });

  it("displays a message when there are no groups", () => {
    render(<GroupClient groups={[]} />);

    expect(
      screen.getByText("There are no created groups."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Next")).not.toBeInTheDocument();
    expect(screen.queryByText("Previous")).not.toBeInTheDocument();
  });
});
