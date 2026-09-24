import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchProvider } from "@/contexts/SearchContext";
import { Search } from "@/components/explore/search";
import { SortedDropletsGrid } from "@/components/explore/sorted-droplets-grid";
import { SortedPlaylistsGrid } from "@/components/explore/sorted-playlists-grid";
import { VoyagesGrid } from "@/components/explore/voyages-grid";
import { Droplet, Playlist, Voyage } from "@/types";

// Reads the real (jsdom) URL, so ?q / ?page behave as in the browser
jest.mock("next/navigation", () => ({
  usePathname: () => "/explore",
  useSearchParams: () => new URLSearchParams(window.location.search),
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@/components/droplets/droplet-tile", () => ({
  DropletTile: ({ droplet }: { droplet: Droplet }) => (
    <li data-testid="droplet">{droplet.name}</li>
  ),
}));
jest.mock("@/components/playlists/playlist-card", () => ({
  PlaylistCard: ({ playlist }: { playlist: Playlist }) => (
    <li data-testid="playlist">{playlist.name}</li>
  ),
}));
jest.mock("@/components/voyages/voyage-card", () => ({
  VoyageCard: ({ voyage }: { voyage: Voyage }) => (
    <div data-testid="voyage">{voyage.name}</div>
  ),
}));

const setUrl = (query: string) =>
  window.history.replaceState(null, "", `/explore${query}`);

const makeDroplets = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    id: i + 1,
    name: `Droplet ${String(i + 1).padStart(2, "0")}`,
    completionPercentage: 0,
  })) as unknown as Array<Droplet & { completionPercentage: number }>;

const renderDroplets = (
  droplets: Array<Droplet & { completionPercentage: number }>,
) =>
  render(
    <SearchProvider>
      <Search />
      <SortedDropletsGrid
        droplets={droplets}
        completedLessonIds={[]}
        enrolledDropletIds={[]}
        ratingsMap={new Map()}
        dueDates={[]}
      />
    </SearchProvider>,
  );

const shown = (testId: string) =>
  screen.queryAllByTestId(testId).map((el) => el.textContent);

describe("Explore search", () => {
  beforeEach(() => setUrl(""));

  it("starts from ?q and keeps it in the URL", async () => {
    setUrl("?q=python");
    renderDroplets([
      { id: 1, name: "Intro to Python", completionPercentage: 0 },
      { id: 2, name: "Resumes", completionPercentage: 0 },
    ] as unknown as Array<Droplet & { completionPercentage: number }>);

    expect(screen.getByPlaceholderText("Search...")).toHaveValue("python");
    expect(shown("droplet")).toEqual(["Intro to Python"]);
    await new Promise((resolve) => setTimeout(resolve, 350));
    expect(window.location.search).toBe("?q=python");
  });

  it("shows close matches for a misspelled search, and says so", () => {
    setUrl("?q=pyhton");
    renderDroplets([
      { id: 1, name: "Intro to Python", completionPercentage: 0 },
      { id: 2, name: "Resumes", completionPercentage: 0 },
    ] as unknown as Array<Droplet & { completionPercentage: number }>);

    expect(shown("droplet")).toEqual(["Intro to Python"]);
    expect(
      screen.getByText("No exact matches for “pyhton”. Showing close matches."),
    ).toBeInTheDocument();
  });

  it("matches droplet descriptions and tag names, every word somewhere", async () => {
    setUrl("?q=pandas%20beginner");
    renderDroplets([
      {
        id: 1,
        name: "Data Wrangling",
        description: "Clean data with pandas",
        tags: [{ id: 1, name: "Beginner", slug: "beginner" }],
        completionPercentage: 0,
      },
      {
        id: 2,
        name: "Pandas deep dive",
        tags: [{ id: 2, name: "Advanced", slug: "advanced" }],
        completionPercentage: 0,
      },
    ] as unknown as Array<Droplet & { completionPercentage: number }>);

    expect(shown("droplet")).toEqual(["Data Wrangling"]);
  });

  it("names the search when nothing matches", () => {
    setUrl("?q=zzz");
    renderDroplets(makeDroplets(3));

    expect(
      screen.getByText('There are no Droplets that match "zzz".'),
    ).toBeInTheDocument();
  });

  it("matches playlist descriptions", () => {
    setUrl("?q=interview");
    render(
      <SearchProvider>
        <SortedPlaylistsGrid
          playlistsWithCompletion={
            [
              { id: 1, name: "Careers", description: "Interview prep" },
              { id: 2, name: "Python" },
            ] as unknown as Playlist[]
          }
        />
      </SearchProvider>,
    );

    expect(shown("playlist")).toEqual(["Careers"]);
  });

  it("filters voyages by name and description", () => {
    setUrl("?q=web");
    render(
      <SearchProvider>
        <VoyagesGrid
          voyages={
            [
              {
                id: 1,
                name: "Frontend path",
                description: "Build for the web",
              },
              { id: 2, name: "Data path", description: "Analyse data" },
            ] as unknown as Voyage[]
          }
        />
      </SearchProvider>,
    );

    expect(shown("voyage")).toEqual(["Frontend path"]);
  });
});

describe("Explore page number", () => {
  beforeEach(() => setUrl(""));

  it("opens on the page in ?page", () => {
    setUrl("?page=2");
    renderDroplets(makeDroplets(20));

    // 9 per page: page 2 is droplets 10-18
    expect(shown("droplet")[0]).toBe("Droplet 10");
    expect(shown("droplet")).toHaveLength(9);
  });

  it("writes the page to the URL without a server navigation", () => {
    renderDroplets(makeDroplets(20));

    fireEvent.click(screen.getByRole("button", { name: "3" }));

    expect(window.location.search).toBe("?page=3");
    expect(shown("droplet")).toEqual(["Droplet 19", "Droplet 20"]);
  });

  it("goes back to page 1 when the search changes", async () => {
    setUrl("?page=2");
    renderDroplets(makeDroplets(20));

    await userEvent.type(screen.getByPlaceholderText("Search..."), "Droplet");

    expect(shown("droplet")[0]).toBe("Droplet 01");
    expect(new URLSearchParams(window.location.search).get("page")).toBeNull();
  });

  it("shows the last page when ?page is past the end", () => {
    setUrl("?page=99");
    renderDroplets(makeDroplets(20));

    expect(shown("droplet")).toEqual(["Droplet 19", "Droplet 20"]);
  });
});
