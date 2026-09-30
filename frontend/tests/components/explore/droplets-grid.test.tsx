import { render, screen } from "@testing-library/react";
import { DropletsGrid } from "@/components/explore/droplets-grid";
import type { Droplet } from "@/types";
import { getCachedEnrollmentsWithLessonIds } from "@/lib/requests/cached";

jest.mock("@/lib/auth/session", () => ({
  getCurrentUser: jest.fn().mockResolvedValue({ email: "test@example.com" }),
}));

jest.mock("@/lib/auth/current-user-id", () => ({
  getAuthorizedUserId: jest.fn().mockResolvedValue(1),
}));

jest.mock("@/lib/requests/cached", () => ({
  getCachedEnrollmentsWithLessonIds: jest.fn(),
}));

jest.mock("@/lib/requests/groups", () => ({
  getUserDueDates: jest.fn().mockResolvedValue([]),
}));

jest.mock("@/lib/requests/droplet", () => ({
  getFavoritedDropletIds: jest.fn().mockResolvedValue([]),
}));

jest.mock("@/components/explore/sorted-droplets-grid", () => ({
  SortedDropletsGrid: ({
    enrolledDropletIds,
    archivedDropletIds,
  }: {
    enrolledDropletIds: number[];
    archivedDropletIds: number[];
  }) => (
    <div>
      <span data-testid="enrolled">{JSON.stringify(enrolledDropletIds)}</span>
      <span data-testid="archived">{JSON.stringify(archivedDropletIds)}</span>
    </div>
  ),
}));

describe("DropletsGrid", () => {
  it("skips enrollments whose droplet is null", async () => {
    (getCachedEnrollmentsWithLessonIds as jest.Mock).mockResolvedValue([
      { droplet: null, isArchived: true, viewedLessons: [] },
      { droplet: { id: 2 }, isArchived: false, viewedLessons: [] },
    ]);

    render(
      await DropletsGrid({
        droplets: [{ id: 2, lessons: [] } as unknown as Droplet],
      }),
    );

    expect(screen.getByTestId("enrolled")).toHaveTextContent("[2]");
    expect(screen.getByTestId("archived")).toHaveTextContent("[]");
  });
});
