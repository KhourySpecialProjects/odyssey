import { getAuthorizedUserId } from "@/lib/auth/current-user-id";
import { getCachedUser } from "@/lib/requests/cached";

jest.mock("@/lib/requests/cached", () => ({
  getCachedUser: jest.fn(),
}));

describe("getAuthorizedUserId", () => {
  beforeEach(() => jest.clearAllMocks());

  it("uses the id from the session token without a lookup", async () => {
    const id = await getAuthorizedUserId({
      id: 42,
      email: "a@b.com",
      roles: [],
      isActive: true,
    });
    expect(id).toBe(42);
    expect(getCachedUser).not.toHaveBeenCalled();
  });

  it("falls back to the email lookup for tokens without an id", async () => {
    (getCachedUser as jest.Mock).mockResolvedValue({ id: 9 });
    const id = await getAuthorizedUserId({
      email: "a@b.com",
      roles: [],
      isActive: true,
    });
    expect(id).toBe(9);
    expect(getCachedUser).toHaveBeenCalledWith("a@b.com");
  });

  it("returns undefined without a user or email", async () => {
    expect(await getAuthorizedUserId(undefined)).toBeUndefined();
    expect(
      await getAuthorizedUserId({ roles: [], isActive: true }),
    ).toBeUndefined();
    expect(getCachedUser).not.toHaveBeenCalled();
  });

  it("returns undefined when the lookup finds no user", async () => {
    (getCachedUser as jest.Mock).mockResolvedValue(undefined);
    expect(
      await getAuthorizedUserId({
        email: "a@b.com",
        roles: [],
        isActive: true,
      }),
    ).toBeUndefined();
  });
});
