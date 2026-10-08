/** Profile page hides unlisted droplets from Created and Completed. */
import PublicProfilePage from "@/app/(general)/prof/[username]/page";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { getEnrollmentsByAuthorizedUser } from "@/lib/requests/enrollment";
import { fetchFriends } from "@/lib/requests/friends";
import { fetchUserAnnouncements } from "@/lib/requests/feed";
import { getCurrentUser } from "@/lib/auth/session";
import { getAuthorizedUserId } from "@/lib/auth/current-user-id";
import { getCachedUserSocial } from "@/lib/requests/cached";
import { LISTED_DROPLET_FILTER } from "@/lib/droplet-visibility";

jest.mock("@/lib/requests/authorized-user", () => ({
  getAuthorizedUserByEmail: jest.fn(),
}));
jest.mock("@/lib/requests/enrollment", () => ({
  getEnrollmentsByAuthorizedUser: jest.fn(),
}));
jest.mock("@/lib/requests/friends", () => ({ fetchFriends: jest.fn() }));
jest.mock("@/lib/requests/feed", () => ({ fetchUserAnnouncements: jest.fn() }));
jest.mock("@/lib/auth/session", () => ({ getCurrentUser: jest.fn() }));
jest.mock("@/lib/auth/current-user-id", () => ({
  getAuthorizedUserId: jest.fn(),
}));
jest.mock("@/lib/requests/cached", () => ({ getCachedUserSocial: jest.fn() }));
jest.mock("@/app/(general)/prof/[username]/profile-content", () => ({
  ProfileContent: () => null,
}));
jest.mock("@/app/(general)/prof/[username]/private-profile-error", () => ({
  PrivateProfileError: () => null,
}));

const enrollment = (id: number, droplet: object) => ({
  id,
  isComplete: true,
  droplet,
});

describe("PublicProfilePage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getAuthorizedUserByEmail as jest.Mock).mockResolvedValue({
      id: 7,
      isPublic: true,
    });
    (getEnrollmentsByAuthorizedUser as jest.Mock).mockResolvedValue([
      enrollment(1, { id: 1, isHidden: false, status: "published" }),
      enrollment(2, { id: 2, isHidden: true, status: "published" }),
      enrollment(3, { id: 3, isHidden: false, status: "draft" }),
    ]);
    (fetchFriends as jest.Mock).mockResolvedValue([]);
    (fetchUserAnnouncements as jest.Mock).mockResolvedValue([]);
    (getAuthorizedUserId as jest.Mock).mockResolvedValue(7);
    (getCachedUserSocial as jest.Mock).mockResolvedValue({ id: 7 });
  });

  it.each([
    ["another viewer", "other@northeastern.edu"],
    ["the owner", "jane@northeastern.edu"],
  ])("drops unlisted enrollments for %s", async (_label, email) => {
    (getCurrentUser as jest.Mock).mockResolvedValue({ email });

    const el = await PublicProfilePage({
      params: Promise.resolve({ username: "jane" }),
    });

    expect(el.props.enrollments.map((e: { id: number }) => e.id)).toEqual([1]);
  });

  it("filters the Created populate to listed droplets", async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue(null);

    await PublicProfilePage({ params: Promise.resolve({ username: "jane" }) });

    const options = (getAuthorizedUserByEmail as jest.Mock).mock.calls[0][1];
    expect(options.populate.droplets.filters).toEqual(LISTED_DROPLET_FILTER);
  });
});
