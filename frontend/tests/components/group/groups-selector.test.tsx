import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GroupsSelector } from "@/app/(groups)/g/dashboard/group-selector";
import { useSession } from "next-auth/react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { AuthorizedUserRoleTitle } from "@/lib/globals";

jest.mock("next-auth/react", () => ({
  useSession: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
  useSearchParams: jest.fn(),
}));

jest.mock("@/components/group/refresh-groups-button", () => ({
  RefreshGroupsButton: () => <button>Refresh</button>,
}));

describe("GroupsSelector", () => {
  const push = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push });
    (usePathname as jest.Mock).mockReturnValue("/g/dashboard");
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams());
  });

  it("shows Member, Admin, and Archived tabs for a student", () => {
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { roles: [AuthorizedUserRoleTitle.User] } },
    });

    render(<GroupsSelector />);

    expect(screen.getByText("Member")).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(screen.getByText("Archived")).toBeInTheDocument();
    expect(screen.queryByText("Creator")).not.toBeInTheDocument();
  });

  it("shows Member, Admin, Creator, and Archived (in that order) for a creator", () => {
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { roles: [AuthorizedUserRoleTitle.ContentCreator] } },
    });

    render(<GroupsSelector />);

    const tabNames = screen
      .getAllByRole("button")
      .map((button) => button.textContent)
      .filter((text) =>
        ["Member", "Admin", "Creator", "Archived"].includes(text || ""),
      );

    expect(tabNames).toEqual(["Member", "Admin", "Creator", "Archived"]);
  });

  it("pushes ?tab=archived when the Archived tab is clicked", async () => {
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { roles: [AuthorizedUserRoleTitle.User] } },
    });

    render(<GroupsSelector />);

    await userEvent.click(screen.getByText("Archived"));

    expect(push).toHaveBeenCalledWith("/g/dashboard?tab=archived");
  });

  it("applies active styling to the Archived tab when ?tab=archived", () => {
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { roles: [AuthorizedUserRoleTitle.User] } },
    });
    (useSearchParams as jest.Mock).mockReturnValue(
      new URLSearchParams("tab=archived"),
    );

    render(<GroupsSelector />);

    expect(screen.getByText("Archived")).toHaveClass(
      "border-[#287697]",
      "bg-[#287697]",
      "text-white",
    );
    expect(screen.getByText("Member")).not.toHaveClass("bg-[#287697]");
  });
});
