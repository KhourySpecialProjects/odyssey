import { render, screen } from "@testing-library/react";
import { FavoriteDropletsGrid } from "@/components/dashboard/favorited-droplet-grid";
import { getCurrentUser } from "@/lib/auth/session";
import { getCachedEnrollmentsFavorites } from "@/lib/requests/cached";
import { getDroplets, getFavoritedDropletIds } from "@/lib/requests/droplet";

jest.mock("@/lib/auth/session", () => ({ getCurrentUser: jest.fn() }));

jest.mock("@/lib/requests/cached", () => ({
  getCachedUser: jest.fn(),
  getCachedEnrollmentsFavorites: jest.fn(),
}));

jest.mock("@/lib/requests/droplet", () => ({
  getDroplets: jest.fn(),
  getFavoritedDropletIds: jest.fn(),
}));

jest.mock("@/components/dashboard/enrolled-droplets-grid-client", () => ({
  EnrolledDropletsGridClient: ({
    dropletsWithCompletion,
  }: {
    dropletsWithCompletion: any[];
  }) => (
    <div>
      {dropletsWithCompletion.map((d) => (
        <div key={d.id}>
          {d.name}: {d.completionPercentage}%
        </div>
      ))}
    </div>
  ),
}));

const droplet = (id: number, lessonIds: number[] = [1, 2]) => ({
  id,
  name: `Droplet ${id}`,
  lessons: lessonIds.map((lid) => ({ id: lid + id * 100 })),
});

describe("FavoriteDropletsGrid", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getCurrentUser as jest.Mock).mockResolvedValue({
      id: 7,
      email: "a@example.com",
    });
    (getCachedEnrollmentsFavorites as jest.Mock).mockResolvedValue([]);
  });

  it("shows a favorited droplet the user never enrolled in, at 0%", async () => {
    (getFavoritedDropletIds as jest.Mock).mockResolvedValue([5]);
    (getDroplets as jest.Mock).mockResolvedValue([droplet(5)]);

    render(await FavoriteDropletsGrid({}));

    expect(screen.getByText("Droplet 5: 0%")).toBeInTheDocument();
    expect(getFavoritedDropletIds).toHaveBeenCalledWith(7);
    expect(getDroplets).toHaveBeenCalledWith(
      expect.objectContaining({ filters: { id: { $in: [5] } } }),
    );
  });

  it("keeps lesson progress for a favorited droplet the user enrolled in", async () => {
    const enrolled = droplet(6);
    (getFavoritedDropletIds as jest.Mock).mockResolvedValue([5, 6]);
    (getDroplets as jest.Mock).mockResolvedValue([droplet(5), enrolled]);
    (getCachedEnrollmentsFavorites as jest.Mock).mockResolvedValue([
      { droplet: enrolled, viewedLessons: [{ id: 601 }] },
    ]);

    render(await FavoriteDropletsGrid({}));

    expect(screen.getByText("Droplet 6: 50%")).toBeInTheDocument();
    expect(screen.getByText("Droplet 5: 0%")).toBeInTheDocument();
  });

  it("shows the empty state without querying droplets when nothing is favorited", async () => {
    (getFavoritedDropletIds as jest.Mock).mockResolvedValue([]);

    render(await FavoriteDropletsGrid({}));

    expect(screen.getByText("No favorited droplets")).toBeInTheDocument();
    expect(getDroplets).not.toHaveBeenCalled();
  });
});
