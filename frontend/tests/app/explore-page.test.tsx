import { render, screen } from "@testing-library/react";
import ExplorePage from "@/app/(general)/explore/page";
import { getDroplets } from "@/lib/requests/droplet";
import { getPlaylists } from "@/lib/requests/playlist";
import { getVoyages } from "@/lib/requests/voyage";

jest.mock("@/lib/requests/droplet", () => ({ getDroplets: jest.fn() }));
jest.mock("@/lib/requests/playlist", () => ({ getPlaylists: jest.fn() }));
jest.mock("@/lib/requests/voyage", () => ({ getVoyages: jest.fn() }));

jest.mock("@/components/explore/droplets-grid", () => ({
  DropletsGrid: ({ droplets }: { droplets: unknown[] }) => (
    <div data-testid="droplets-grid">{droplets.length} droplets</div>
  ),
}));
jest.mock("@/components/explore/playlists-grid", () => ({
  PlaylistsGrid: () => <div data-testid="playlists-grid" />,
}));
jest.mock("@/components/explore/voyages-grid", () => ({
  VoyagesGrid: () => <div data-testid="voyages-grid" />,
}));
jest.mock("@/components/explore/content-type-selector", () => ({
  ContentTypeSelector: () => null,
}));
jest.mock("@/components/explore/search", () => ({ Search: () => null }));
jest.mock("@/components/explore/sort", () => ({ Sort: () => null }));
jest.mock("@/components/explore/filter", () => ({ Filter: () => null }));
jest.mock("@/components/explore/tag-filter", () => ({ TagFilter: () => null }));
jest.mock("@/contexts/SearchContext", () => ({
  SearchProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const renderPage = async (params: Record<string, string>) =>
  render(await ExplorePage({ searchParams: Promise.resolve(params) }));

describe("Explore page content type", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getDroplets as jest.Mock).mockResolvedValue([{ id: 1 }, { id: 2 }]);
    (getPlaylists as jest.Mock).mockResolvedValue([{ id: 7 }]);
    (getVoyages as jest.Mock).mockResolvedValue([]);
  });

  it("falls back to droplets for an unknown contentType", async () => {
    await renderPage({ contentType: "bogus" });

    expect(screen.getByTestId("droplets-grid")).toHaveTextContent("2 droplets");
    expect(screen.queryByTestId("playlists-grid")).not.toBeInTheDocument();
    // Full tile data for droplets; playlists only fetched for the count
    expect(getDroplets).toHaveBeenCalledWith(
      expect.objectContaining({
        fields: expect.arrayContaining(["name", "slug"]),
      }),
    );
    expect(getPlaylists).toHaveBeenCalledWith(
      expect.objectContaining({ fields: ["id"] }),
    );
  });

  it("filters droplets by the selected difficulties, alongside the other filters", async () => {
    await renderPage({ difficulty: "beginner,advanced", type: "skill" });

    const { filters } = (getDroplets as jest.Mock).mock.calls[0][0];
    expect(filters.$and).toEqual(
      expect.arrayContaining([
        { status: { $eq: "published" } },
        { $or: [{ type: { $eq: "skill" } }] },
        {
          $or: [
            { difficulty: { $eq: "beginner" } },
            { difficulty: { $eq: "advanced" } },
          ],
        },
      ]),
    );
  });

  it("doesn't filter by difficulty when none is selected", async () => {
    await renderPage({});

    const { filters } = (getDroplets as jest.Mock).mock.calls[0][0];
    expect(JSON.stringify(filters)).not.toContain("difficulty");
  });

  it("shows playlists with full data when requested", async () => {
    await renderPage({ contentType: "playlists" });

    expect(screen.getByTestId("playlists-grid")).toBeInTheDocument();
    expect(getPlaylists).toHaveBeenCalledWith(
      expect.not.objectContaining({ fields: ["id"] }),
    );
  });
});
