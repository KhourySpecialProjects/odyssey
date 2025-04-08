import { render, screen, fireEvent } from "@testing-library/react";
import { AuthorizedUserClient } from "@/components/admin/users/authorized-user-client";
import { TimeZone } from "@/types";

jest.mock("@/components/admin/users/authorized-user", () => ({
  AuthorizedUserBlock: ({ user }: { user: any }) => (
    <div data-testid={`user-${user.id}`}>{user.email}</div>
  ),
}));

describe("AuthorizedUserClient", () => {
  const mockUsers = Array.from({ length: 25 }, (_, i) => ({
    id: i + 1,
    email: `user${i + 1}@example.com`,
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
  }));

  it("renders a list of users", () => {
    render(<AuthorizedUserClient authorizedUsers={mockUsers.slice(0, 5)} />);

    expect(screen.getByTestId("user-1")).toBeInTheDocument();
    expect(screen.getByTestId("user-5")).toBeInTheDocument();
  });

  it("displays pagination correctly", () => {
    render(<AuthorizedUserClient authorizedUsers={mockUsers} />);

    expect(screen.getByTestId("user-1")).toBeInTheDocument();
    expect(screen.getByTestId("user-10")).toBeInTheDocument();
    expect(screen.getByTestId("user-11")).toBeInTheDocument();
    expect(screen.queryByTestId("user-21")).not.toBeInTheDocument();

    expect(screen.getByText("Next")).toBeInTheDocument();
    const prevButton = screen.getByText("Previous");
    expect(prevButton).toBeInTheDocument();
    expect(prevButton).toBeDisabled();
  });

  it("navigates to next page when Next button is clicked", () => {
    render(<AuthorizedUserClient authorizedUsers={mockUsers} />);

    fireEvent.click(screen.getByText("Next"));

    expect(screen.queryByTestId("user-1")).not.toBeInTheDocument();
    expect(screen.queryByTestId("user-11")).not.toBeInTheDocument();
    expect(screen.queryByTestId("user-15")).not.toBeInTheDocument();
    expect(screen.getByTestId("user-21")).toBeInTheDocument();
    expect(screen.getByTestId("user-24")).toBeInTheDocument();

    expect(screen.getByText("Previous")).toBeInTheDocument();
    const nextButton = screen.getByText("Next");
    expect(nextButton).toBeInTheDocument();
    expect(nextButton).toBeDisabled();
  });

  it("navigates to previous page when Previous button is clicked", () => {
    render(<AuthorizedUserClient authorizedUsers={mockUsers} />);

    fireEvent.click(screen.getByText("Next"));

    fireEvent.click(screen.getByText("Previous"));

    expect(screen.getByTestId("user-1")).toBeInTheDocument();
    expect(screen.getByTestId("user-10")).toBeInTheDocument();
    expect(screen.getByTestId("user-11")).toBeInTheDocument();
    expect(screen.queryByTestId("user-21")).not.toBeInTheDocument();
  });

  it("displays a message when there are no users", () => {
    render(<AuthorizedUserClient authorizedUsers={[]} />);

    expect(
      screen.getByText("There are no authorized users."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Next")).not.toBeInTheDocument();
    expect(screen.queryByText("Previous")).not.toBeInTheDocument();
  });
});
