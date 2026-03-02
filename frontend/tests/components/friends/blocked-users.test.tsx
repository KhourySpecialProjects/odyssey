import { render, screen } from "@testing-library/react";
import { BlockedUsers } from "@/components/friends/blocked-users";
import { getCurrentUser } from "@/lib/auth/session";
import { getCachedUserSocial } from "@/lib/requests/cached";
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

describe("BlockedUsers", () => {
  beforeEach(() => {
    (getCurrentUser as jest.Mock).mockResolvedValue({
      email: "test@example.com",
    });
  });

  it("renders blocked users list when users exist", async () => {
    const mockAuthUser = {
      blocked: [
        {
          id: 1,
          email: "blocked@test.com",
          firstName: "John",
          lastName: "Doe",
        },
      ],
    };
    (getCachedUserSocial as jest.Mock).mockResolvedValue(mockAuthUser);

    const { container } = await render(await BlockedUsers());
    expect(container.querySelector("ul")).toBeInTheDocument();
  });

  it("shows empty state message when no blocked users", async () => {
    const mockAuthUser = { blocked: [] };
    (getCachedUserSocial as jest.Mock).mockResolvedValue(mockAuthUser);

    await render(await BlockedUsers());
    expect(screen.getByText("You have no blocked users")).toBeInTheDocument();
  });

  it("calls notFound when user is not found", async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue(null);

    await BlockedUsers();

    expect(notFound).toHaveBeenCalled();
  });
});
