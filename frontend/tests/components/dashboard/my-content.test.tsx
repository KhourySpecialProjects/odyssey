import { render, screen } from "@testing-library/react";
import { MyContent } from "@/components/dashboard/my-content";
import { getCurrentUser } from "@/lib/auth/session";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { getEnrollmentsByAuthorizedUser } from "@/lib/requests/enrollment";
import { notFound } from "next/navigation";
import { getUserGroups } from "@/lib/requests/groups";

jest.mock("@/lib/auth/session", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("@/lib/requests/authorized-user", () => ({
  getAuthorizedUserByEmail: jest.fn(),
}));

jest.mock("@/lib/requests/enrollment", () => ({
  getEnrollmentsByAuthorizedUser: jest.fn(),
}));

jest.mock("@/lib/requests/groups", () => ({
  getUserGroups: jest.fn().mockResolvedValue([]),
}));

jest.mock("@/components/dashboard/user-playlists-grid", () => ({
  UserPlaylistsGrid: () => (
    <div data-testid="playlists-grid">User Playlists Grid</div>
  ),
}));

jest.mock("@/components/dashboard/enrolled-droplets-grid", () => ({
  EnrolledDropletsGrid: () => (
    <div data-testid="droplets-grid">Enrolled Droplets Grid</div>
  ),
}));

jest.mock("@/components/dashboard/archived-droplets-grid", () => ({
  ArchivedDropletsGrid: () => (
    <div data-testid="archived-grid">Archived Droplets Grid</div>
  ),
}));

jest.mock("next/navigation", () => ({
  notFound: jest.fn(),
}));

jest.mock("@/components/dashboard/content-selector", () => ({
  ContentSelector: () => (
    <div data-testid="content-selector">Content Selector</div>
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
    (getUserGroups as jest.Mock).mockResolvedValue([]);
  });

  it("renders the content selector", async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
    (getAuthorizedUserByEmail as jest.Mock).mockResolvedValue(mockUser);
    (getEnrollmentsByAuthorizedUser as jest.Mock).mockResolvedValue([]);

    render(await MyContent({ searchParams: {} }));
    expect(screen.getByTestId("droplets-grid")).toBeInTheDocument();
  });

  it("renders the droplets grid when tab is droplets", async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
    (getAuthorizedUserByEmail as jest.Mock).mockResolvedValue(mockUser);
    (getEnrollmentsByAuthorizedUser as jest.Mock).mockResolvedValue([]);

    render(await MyContent({ searchParams: { tab: "droplets" } }));
    expect(screen.getByTestId("droplets-grid")).toBeInTheDocument();
  });

  it("renders the playlists grid when tab is playlists", async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
    (getAuthorizedUserByEmail as jest.Mock).mockResolvedValue(mockUser);
    (getEnrollmentsByAuthorizedUser as jest.Mock).mockResolvedValue([]);

    render(await MyContent({ searchParams: { tab: "playlists" } }));
    expect(screen.getByTestId("playlists-grid")).toBeInTheDocument();
  });

  it("renders the archived grid when tab is archived", async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
    (getAuthorizedUserByEmail as jest.Mock).mockResolvedValue(mockUser);
    (getEnrollmentsByAuthorizedUser as jest.Mock).mockResolvedValue([]);

    render(await MyContent({ searchParams: { tab: "archived" } }));
    expect(screen.getByTestId("archived-grid")).toBeInTheDocument();
  });

  it("defaults to droplets tab when no tab is specified", async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
    (getAuthorizedUserByEmail as jest.Mock).mockResolvedValue(mockUser);
    (getEnrollmentsByAuthorizedUser as jest.Mock).mockResolvedValue([]);

    render(await MyContent({ searchParams: {} }));
    expect(screen.getByTestId("droplets-grid")).toBeInTheDocument();
  });

  it("returns null when user is not found", async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue(null);

    await MyContent({ searchParams: {} });
    expect(notFound).toHaveBeenCalled();
  });
});
