/**
 * Pagination behaviour for the groups dashboard grid.
 *
 * The dashboard must start a new page after every 12 groups, so a user with
 * 29 groups sees 12 / 12 / 5 across three pages rather than a single
 * truncated grid.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PaginatedGroupsGrid } from "@/app/(groups)/g/dashboard/paginated-groups-grid";
import type { Group } from "@/types";

jest.mock("@/components/group/group-card", () => ({
  GroupCard: ({ group }: { group: Group }) => (
    <div data-testid="group-card">{group.groupName}</div>
  ),
}));

const ROLE_COLORS = { member: "bg-green-100" };

/** Builds `count` groups named "Group 1".."Group N". */
function makeGroups(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    group: {
      id: i + 1,
      groupName: `Group ${i + 1}`,
      slug: `group-${i + 1}`,
      isArchived: false,
    } as Group,
    role: "member" as const,
  }));
}

function renderGrid(count: number) {
  return render(
    <PaginatedGroupsGrid groups={makeGroups(count)} roleColors={ROLE_COLORS} />,
  );
}

/** Names of the group cards currently on screen. */
function visibleGroupNames() {
  return screen.getAllByTestId("group-card").map((el) => el.textContent);
}

describe("PaginatedGroupsGrid", () => {
  it("shows only the first 12 of 29 groups on page 1", () => {
    renderGrid(29);

    const visible = visibleGroupNames();
    expect(visible).toHaveLength(12);
    expect(visible[0]).toBe("Group 1");
    expect(visible[11]).toBe("Group 12");
    expect(screen.queryByText("Group 13")).not.toBeInTheDocument();
  });

  it("renders a page button per 12-group page", () => {
    renderGrid(29);

    // 29 groups -> ceil(29/12) = 3 pages
    expect(screen.getByRole("button", { name: "1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "3" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "4" })).not.toBeInTheDocument();
  });

  it("shows groups 13-24 on page 2", async () => {
    const user = userEvent.setup();
    renderGrid(29);

    await user.click(screen.getByRole("button", { name: "Next" }));

    const visible = visibleGroupNames();
    expect(visible).toHaveLength(12);
    expect(visible[0]).toBe("Group 13");
    expect(visible[11]).toBe("Group 24");
  });

  it("shows the remaining 5 groups on the last page", async () => {
    const user = userEvent.setup();
    renderGrid(29);

    await user.click(screen.getByRole("button", { name: "3" }));

    const visible = visibleGroupNames();
    expect(visible).toHaveLength(5);
    expect(visible[0]).toBe("Group 25");
    expect(visible[4]).toBe("Group 29");
  });

  it("navigates back with Previous", async () => {
    const user = userEvent.setup();
    renderGrid(29);

    await user.click(screen.getByRole("button", { name: "3" }));
    await user.click(screen.getByRole("button", { name: "Previous" }));

    expect(visibleGroupNames()[0]).toBe("Group 13");
  });

  it("hides pagination controls when 12 or fewer groups exist", () => {
    renderGrid(12);

    expect(visibleGroupNames()).toHaveLength(12);
    expect(
      screen.queryByRole("button", { name: "Next" }),
    ).not.toBeInTheDocument();
  });

  it("starts a second page at exactly 13 groups", () => {
    renderGrid(13);

    expect(visibleGroupNames()).toHaveLength(12);
    expect(screen.getByRole("button", { name: "2" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "3" })).not.toBeInTheDocument();
  });

  // The Refresh button re-renders the page with a new group list but keeps
  // this component mounted, so the current page survives a refresh. These
  // tests simulate that by re-rendering with a different number of groups.
  describe("after a refresh changes the group list", () => {
    it("moves to the new last page when the current page no longer exists", async () => {
      const user = userEvent.setup();
      const { rerender } = renderGrid(29);
      await user.click(screen.getByRole("button", { name: "3" }));
      expect(visibleGroupNames()[0]).toBe("Group 25");

      // Refresh: groups were removed in Strapi, only 15 remain (2 pages).
      rerender(
        <PaginatedGroupsGrid
          groups={makeGroups(15)}
          roleColors={ROLE_COLORS}
        />,
      );

      const visible = visibleGroupNames();
      expect(visible).toHaveLength(3);
      expect(visible[0]).toBe("Group 13");
      expect(
        screen.queryByRole("button", { name: "3" }),
      ).not.toBeInTheDocument();
    });

    it("stays on the current page when it still exists", async () => {
      const user = userEvent.setup();
      const { rerender } = renderGrid(29);
      await user.click(screen.getByRole("button", { name: "2" }));

      // Refresh: new groups were added, now 40 (4 pages).
      rerender(
        <PaginatedGroupsGrid
          groups={makeGroups(40)}
          roleColors={ROLE_COLORS}
        />,
      );

      expect(visibleGroupNames()[0]).toBe("Group 13");
      expect(screen.getByRole("button", { name: "4" })).toBeInTheDocument();
    });

    it("drops the controls when a refresh leaves one page", async () => {
      const user = userEvent.setup();
      const { rerender } = renderGrid(29);
      await user.click(screen.getByRole("button", { name: "3" }));

      rerender(
        <PaginatedGroupsGrid groups={makeGroups(5)} roleColors={ROLE_COLORS} />,
      );

      expect(visibleGroupNames()).toHaveLength(5);
      expect(
        screen.queryByRole("button", { name: "Next" }),
      ).not.toBeInTheDocument();
    });

    it("does not jump back to an old page when a later refresh restores groups", async () => {
      const user = userEvent.setup();
      const { rerender } = renderGrid(29);
      await user.click(screen.getByRole("button", { name: "3" }));

      // First refresh shrinks the list: view clamps to page 2.
      rerender(
        <PaginatedGroupsGrid
          groups={makeGroups(15)}
          roleColors={ROLE_COLORS}
        />,
      );
      expect(visibleGroupNames()[0]).toBe("Group 13");

      // Second refresh restores the groups. The user is looking at page 2 and
      // did not navigate, so they should still be on page 2.
      rerender(
        <PaginatedGroupsGrid
          groups={makeGroups(29)}
          roleColors={ROLE_COLORS}
        />,
      );
      expect(visibleGroupNames()[0]).toBe("Group 13");
    });

    it("keeps working after a clamp: Previous and Next still navigate", async () => {
      const user = userEvent.setup();
      const { rerender } = renderGrid(29);
      await user.click(screen.getByRole("button", { name: "3" }));
      rerender(
        <PaginatedGroupsGrid
          groups={makeGroups(15)}
          roleColors={ROLE_COLORS}
        />,
      );

      await user.click(screen.getByRole("button", { name: "Previous" }));
      expect(visibleGroupNames()[0]).toBe("Group 1");

      await user.click(screen.getByRole("button", { name: "Next" }));
      expect(visibleGroupNames()[0]).toBe("Group 13");
    });
  });
});
