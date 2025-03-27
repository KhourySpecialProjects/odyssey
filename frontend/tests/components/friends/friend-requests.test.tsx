import { fireEvent, render, screen } from "@testing-library/react";
import { FriendRequests } from "@/components/friends/friend-requests";

describe("FriendRequests", () => {
  const mockAuthUser = {
    id: "1",
    received_requests: [
      { id: "2", lastName: "Doe", firstName: "John" },
      { id: "3", lastName: "Smith", firstName: "Jane" },
      { id: "4", lastName: "Brown", firstName: "Bob" },
    ],
    blocked: [],
    was_blocked: [],
  } as any;

  it("filters and sorts friend requests correctly", () => {
    const { getAllByRole } = render(
      <FriendRequests
        noProfile={false}
        friendsPerPage={2}
        authUser={mockAuthUser}
      />,
    );

    const requestElements = getAllByRole("listitem");
    expect(requestElements).toHaveLength(2);
  });

  it("excludes blocked users from requests", () => {
    const userWithBlocked = {
      ...mockAuthUser,
      blocked: [{ id: "2" }],
      was_blocked: [{ id: "3" }],
    };

    const { getAllByRole } = render(
      <FriendRequests
        noProfile={false}
        friendsPerPage={2}
        authUser={userWithBlocked}
      />,
    );

    const requestElements = getAllByRole("listitem");
    expect(requestElements).toHaveLength(1);
  });

  it("handles pagination correctly", () => {
    const { getByRole, getAllByRole } = render(
      <FriendRequests
        noProfile={false}
        friendsPerPage={2}
        authUser={mockAuthUser}
      />,
    );

    expect(getAllByRole("listitem")).toHaveLength(2);
  });

  it("renders correct component based on noProfile prop", () => {
    const { container: profileContainer } = render(
      <FriendRequests
        noProfile={false}
        friendsPerPage={2}
        authUser={mockAuthUser}
      />,
    );

    const { container: feedContainer } = render(
      <FriendRequests
        noProfile={true}
        friendsPerPage={2}
        authUser={mockAuthUser}
      />,
    );

    expect(profileContainer.innerHTML).not.toBe(feedContainer.innerHTML);
  });

  it("navigates to next page when Next button is clicked", () => {
    render(
      <FriendRequests
        noProfile={false}
        friendsPerPage={2}
        authUser={mockAuthUser}
      />,
    );

    const nextButton = screen.getByRole("right");

    fireEvent.click(nextButton);

    expect(screen.queryByText(/john/i)).not.toBeInTheDocument();
  });

  it("navigates to previous page when Previous button is clicked", () => {
    render(
      <FriendRequests
        noProfile={false}
        friendsPerPage={2}
        authUser={mockAuthUser}
      />,
    );

    const nextButton = screen.getByRole("right");

    fireEvent.click(nextButton);

    const prevButton = screen.getByRole("left");

    fireEvent.click(prevButton);

    expect(screen.queryByText(/john/i)).toBeInTheDocument();
  });

  it("displays empty state message when no requests", () => {
    const emptyUser = {
      ...mockAuthUser,
      received_requests: [],
    };

    const { getByText } = render(
      <FriendRequests
        noProfile={false}
        friendsPerPage={2}
        authUser={emptyUser}
      />,
    );

    expect(getByText("You have no friend requests")).toBeInTheDocument();
  });
});
