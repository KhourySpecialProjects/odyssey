import { render, screen } from "@testing-library/react";
import { Friends } from "@/components/friends/friends";
import { getCurrentUser } from "@/lib/auth/session";
import { getCachedUserSocial } from "@/lib/requests/cached";
import { fetchFriends } from "@/lib/requests/friends";
import { notFound } from "next/navigation";

jest.mock("@/lib/auth/session", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  notFound: jest.fn(),
}));

jest.mock("@/lib/requests/cached", () => ({
  getCachedUserSocial: jest.fn(),
}));

jest.mock("@/lib/requests/friends", () => ({
  fetchFriends: jest.fn(),
}));

describe("Friends", () => {
  beforeEach(() => {
    (getCurrentUser as jest.Mock).mockResolvedValue({
      email: "test@example.com",
    });
  });

  it("renders friends list when friends exist", async () => {
    const mockAuthUser = {
      id: 1,
      email: "test@example.com",
      blocked: [],
    };

    const mockFriends = [
      {
        id: 2,
        firstName: "John",
        lastName: "Doe",
        email: "john@test.com",
        blocked: [],
      },
    ];

    (getCachedUserSocial as jest.Mock).mockResolvedValue(mockAuthUser);
    (fetchFriends as jest.Mock).mockResolvedValue(mockFriends);

    const { container } = await render(await Friends());

    expect(screen.getByText("Friends")).toBeInTheDocument();
    expect(container.querySelector("ul")).toBeInTheDocument();
    expect(screen.getByText("John Doe")).toBeInTheDocument();
  });

  it("calls notFound when user is not found", async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue(null);

    await Friends();

    expect(notFound).toHaveBeenCalled();
  });

  it("shows empty state when no friends", async () => {
    const mockAuthUser = {
      id: 1,
      email: "test@example.com",
    };

    (getCachedUserSocial as jest.Mock).mockResolvedValue(mockAuthUser);
    (fetchFriends as jest.Mock).mockResolvedValue([]);

    await render(await Friends());
    expect(screen.getByText("You have no friends :(")).toBeInTheDocument();
  });

  it("renders section header and description", async () => {
    const mockAuthUser = {
      id: 1,
      email: "test@example.com",
    };

    (getCachedUserSocial as jest.Mock).mockResolvedValue(mockAuthUser);
    (fetchFriends as jest.Mock).mockResolvedValue([]);

    await render(await Friends());

    expect(screen.getByText("Friends")).toBeInTheDocument();
    expect(screen.getByText("A list of your friends.")).toBeInTheDocument();
  });
});
