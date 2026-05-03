import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MyContentTabs } from "@/components/my-content/my-content-tabs";
import { Droplet, Playlist, Voyage } from "@/types";

// --- navigation mock ---------------------------------------------------
// handleTabChange calls router.push directly, so this is what we assert on.
const mockPush = jest.fn();
const mockReplace = jest.fn();
let mockSearchParamsString =
  "tab=droplets&focusArea=technical&visibility=archived";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  usePathname: () => "/my-content",
  useSearchParams: () => new URLSearchParams(mockSearchParamsString),
}));

// --- child component mocks --------------------------------------------
jest.mock("@/components/my-content/my-content-toolbar", () => ({
  MyContentToolbar: ({ tab }: { tab: string }) => (
    <div data-testid="toolbar" data-tab={tab} />
  ),
}));
jest.mock("@/components/my-content/droplets-creator-grid", () => ({
  DropletsCreatorGrid: () => <div data-testid="droplets-grid" />,
}));
jest.mock("@/components/my-content/playlists-creator-grid", () => ({
  PlaylistsCreatorGrid: () => <div data-testid="playlists-grid" />,
}));
jest.mock("@/components/my-content/voyages-creator-grid", () => ({
  VoyagesCreatorGrid: () => <div data-testid="voyages-grid" />,
}));

// --- fixtures ---------------------------------------------------------
const makeDroplet = (id: number): Droplet =>
  ({
    id,
    name: `Droplet ${id}`,
    slug: `droplet-${id}`,
    status: "published",
    type: "knowledge",
    focusArea: "technical",
    difficulty: "beginner",
    isHidden: false,
    learningObjectives: [],
  }) as Droplet;

const makePlaylist = (id: number): Playlist =>
  ({
    id,
    name: `Playlist ${id}`,
    slug: `playlist-${id}`,
    isPublic: true,
    duration: "short",
    isArchived: false,
  }) as Playlist;

const makeVoyage = (id: number): Voyage =>
  ({
    id,
    name: `Voyage ${id}`,
    slug: `voyage-${id}`,
    description: "",
    status: "published",
    isSequential: false,
    isArchived: false,
  }) as Voyage;

const defaultProps = {
  droplets: [makeDroplet(1), makeDroplet(2)],
  playlists: [makePlaylist(1)],
  voyages: [makeVoyage(1)],
  showPlaylists: true,
  showVoyages: true,
  currentUserId: 42,
};

function renderTabs(
  searchParams = "tab=droplets&focusArea=technical&visibility=archived",
) {
  mockSearchParamsString = searchParams;
  return render(<MyContentTabs {...defaultProps} />);
}

// --- tests ------------------------------------------------------------
describe("MyContentTabs", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders all three tab buttons", () => {
    renderTabs();
    expect(
      screen.getByRole("button", { name: /droplets/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /playlists/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /voyages/i }),
    ).toBeInTheDocument();
  });

  it("shows unfiltered counts on tab buttons", () => {
    renderTabs();
    expect(
      screen.getByRole("button", { name: /droplets \(2\)/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /playlists \(1\)/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /voyages \(1\)/i }),
    ).toBeInTheDocument();
  });

  it("renders the toolbar with the active tab", () => {
    renderTabs("tab=droplets");
    const toolbar = screen.getByTestId("toolbar");
    expect(toolbar).toHaveAttribute("data-tab", "droplets");
  });

  it("renders the droplets grid when active tab is droplets", () => {
    renderTabs("tab=droplets");
    expect(screen.getByTestId("droplets-grid")).toBeInTheDocument();
  });

  it("renders the playlists grid when active tab is playlists", () => {
    renderTabs("tab=playlists");
    expect(screen.getByTestId("playlists-grid")).toBeInTheDocument();
  });

  it("renders the voyages grid when active tab is voyages", () => {
    renderTabs("tab=voyages");
    expect(screen.getByTestId("voyages-grid")).toBeInTheDocument();
  });

  describe("tab-switch param cleanup", () => {
    it("clears droplet-only params (focusArea) but preserves shared params (visibility) when switching to playlists", async () => {
      renderTabs("tab=droplets&focusArea=technical&visibility=archived");

      await userEvent.click(screen.getByRole("button", { name: /playlists/i }));

      expect(mockPush).toHaveBeenCalledTimes(1);
      const calledUrl = mockPush.mock.calls[0][0] as string;
      const params = new URLSearchParams(calledUrl.split("?")[1]);

      expect(params.get("tab")).toBe("playlists");
      // visibility is allowed on playlists — must be preserved
      expect(params.get("visibility")).toBe("archived");
      // focusArea is droplets-only — must be removed
      expect(params.has("focusArea")).toBe(false);
    });

    it("preserves q and sort when switching tabs, removes tab-specific params", async () => {
      renderTabs("tab=droplets&q=python&sort=name%3Aasc&status=draft");

      await userEvent.click(screen.getByRole("button", { name: /playlists/i }));

      const calledUrl = mockPush.mock.calls[0][0] as string;
      const params = new URLSearchParams(calledUrl.split("?")[1]);

      expect(params.get("q")).toBe("python");
      expect(params.get("sort")).toBe("name:asc");
      // status is droplets-only
      expect(params.has("status")).toBe(false);
    });

    it("clears public param when switching from playlists to voyages", async () => {
      renderTabs("tab=playlists&public=public&visibility=active");

      await userEvent.click(screen.getByRole("button", { name: /voyages/i }));

      const calledUrl = mockPush.mock.calls[0][0] as string;
      const params = new URLSearchParams(calledUrl.split("?")[1]);

      expect(params.get("tab")).toBe("voyages");
      expect(params.get("visibility")).toBe("active");
      // public is playlists-only
      expect(params.has("public")).toBe(false);
    });
  });
});
