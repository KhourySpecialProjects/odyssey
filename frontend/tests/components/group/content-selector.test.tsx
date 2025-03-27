import { render, screen } from "@testing-library/react";
import { ContentSelector } from "@/components/dashboard/content-selector";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { AuthorizedUserRoleTitle } from "@/lib/globals";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
  usePathname: jest.fn(),
}));

describe("ContentSelector", () => {
  const mockUser = {
    id: 1,
    email: "user@example.com",
    firstName: "John",
    lastName: "Doe",
    bio: "Test bio",
    profilePhoto: "https://example.com/photo.jpg",
    isEnabled: true,
    roles: [AuthorizedUserRoleTitle.Faculty],

    isActive: true,
  };

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({ push: jest.fn() });
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams());
    (usePathname as jest.Mock).mockReturnValue("/test");
  });

  it("renders all tabs", () => {
    render(<ContentSelector user={mockUser} />);
    expect(screen.getByText("Droplets")).toBeInTheDocument();
    expect(screen.getByText("Playlists")).toBeInTheDocument();
    expect(screen.getByText("Archived")).toBeInTheDocument();
  });

  it("highlights active tab", () => {
    (useSearchParams as jest.Mock).mockReturnValue(
      new URLSearchParams("tab=playlists"),
    );
    render(<ContentSelector user={mockUser} />);
    expect(screen.getByText("Playlists").parentElement).toHaveClass(
      "space-x-8",
    );
  });
});
