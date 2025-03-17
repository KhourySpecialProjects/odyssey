import { render, screen } from "@testing-library/react";
import { MyContent } from "@/components/dashboard/my-content";
import { getCurrentUser } from "@/lib/auth/session";

// Mock dependencies
jest.mock("@/lib/auth/session", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("@/components/dashboard/content-selector", () => ({
  ContentSelector: ({ user }: { user: any }) => (
    <div data-testid="content-selector">Content Selector for {user.email}</div>
  ),
}));

jest.mock("@/components/dashboard/enrolled-droplets-grid", () => ({
  EnrolledDropletsGrid: () => (
    <div data-testid="droplets-grid">Enrolled Droplets Grid</div>
  ),
}));

jest.mock("@/components/dashboard/user-playlists-grid", () => ({
  UserPlaylistsGrid: () => (
    <div data-testid="playlists-grid">User Playlists Grid</div>
  ),
}));

jest.mock("@/components/dashboard/archived-droplets-grid", () => ({
  ArchivedDropletsGrid: () => (
    <div data-testid="archived-grid">Archived Droplets Grid</div>
  ),
}));

describe("MyContent", () => {
  const mockUser = {
    email: "test@example.com",
    roles: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
  });

  it("renders the content selector", async () => {
    render(await MyContent({ searchParams: { tab: "droplets" } }));

    expect(screen.getByTestId("content-selector")).toBeInTheDocument();
  });

  it("renders the droplets grid when tab is droplets", async () => {
    render(await MyContent({ searchParams: { tab: "droplets" } }));

    expect(screen.getByTestId("droplets-grid")).toBeInTheDocument();
  });

  it("renders the playlists grid when tab is playlists", async () => {
    render(await MyContent({ searchParams: { tab: "playlists" } }));

    expect(screen.getByTestId("playlists-grid")).toBeInTheDocument();
  });

  it("renders the archived grid when tab is archived", async () => {
    render(await MyContent({ searchParams: { tab: "archived" } }));

    expect(screen.getByTestId("archived-grid")).toBeInTheDocument();
  });

  it("defaults to droplets tab when no tab is specified", async () => {
    render(await MyContent({ searchParams: {} }));

    expect(screen.getByTestId("droplets-grid")).toBeInTheDocument();
  });

  it("returns null when user is not found", async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue(null);

    const result = await MyContent({ searchParams: {} });
    expect(result).toBeNull();
  });
});
