import { refreshGroup } from "@/lib/requests/groups";
import { requireRole } from "@/lib/auth/require-role";
import { fetchAPI } from "@/lib/utils";
import { revalidateTag } from "next/cache";
import { authFixtures } from "../helpers/server-action-auth";
import { AuthorizedUserRoleTitle } from "@/lib/globals";

jest.mock("@/lib/utils", () => ({ fetchAPI: jest.fn() }));
jest.mock("@/lib/auth/session", () => ({ getCurrentUser: jest.fn() }));
jest.mock("@/lib/auth/require-role", () => ({ requireRole: jest.fn() }));
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}));
jest.mock("@/lib/requests/authorized-user", () => ({}));
jest.mock("@/lib/requests/enrollment", () => ({}));
jest.mock("@/lib/requests/playlist-enrollment", () => ({}));
jest.mock("@/lib/requests/voyage-enrollment", () => ({}));

const mockedRequireRole = jest.mocked(requireRole);
const mockedFetchAPI = jest.mocked(fetchAPI);

const group = {
  id: 1,
  members: [{ id: 10 }],
  admins: [{ id: 11 }],
  managers: [{ id: 12 }],
  creator: { id: 13 },
};

describe("refreshGroup", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedFetchAPI.mockResolvedValue([group]);
  });

  it("rejects an unauthenticated caller without reading or invalidating", async () => {
    mockedRequireRole.mockResolvedValue(authFixtures.loggedOut());

    const res = await refreshGroup("cs-101");

    expect(res).toEqual({ ok: false, error: "unauthenticated" });
    expect(mockedFetchAPI).not.toHaveBeenCalled();
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("requires a session only (no role gate)", async () => {
    mockedRequireRole.mockResolvedValue(authFixtures.as({ id: 10 }));
    await refreshGroup("cs-101");
    expect(mockedRequireRole).toHaveBeenCalledWith([]);
  });

  it("rejects a non-member and invalidates nothing", async () => {
    mockedRequireRole.mockResolvedValue(authFixtures.as({ id: 99 }));

    const res = await refreshGroup("cs-101");

    expect(res).toEqual({ ok: false, error: "forbidden" });
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("rejects an unknown group and invalidates nothing", async () => {
    mockedRequireRole.mockResolvedValue(authFixtures.as({ id: 10 }));
    mockedFetchAPI.mockResolvedValue([]);

    const res = await refreshGroup("nope");

    expect(res).toEqual({ ok: false, error: "forbidden" });
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("rejects a blank slug without reading Strapi", async () => {
    mockedRequireRole.mockResolvedValue(authFixtures.as({ id: 10 }));

    const res = await refreshGroup("  ");

    expect(res).toEqual({ ok: false, error: "forbidden" });
    expect(mockedFetchAPI).not.toHaveBeenCalled();
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("fails closed (no invalidation) when the membership read throws", async () => {
    mockedRequireRole.mockResolvedValue(authFixtures.as({ id: 10 }));
    mockedFetchAPI.mockRejectedValue(new Error("boom"));

    const res = await refreshGroup("cs-101");

    expect(res).toEqual({ ok: false, error: "forbidden" });
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("reads the group fresh, never from the cache it is about to clear", async () => {
    mockedRequireRole.mockResolvedValue(authFixtures.as({ id: 10 }));

    await refreshGroup("cs-101");

    const [, opts] = mockedFetchAPI.mock.calls[0];
    expect(opts).toEqual(
      expect.objectContaining({
        cache: "no-store",
        urlParams: expect.objectContaining({
          filters: { slug: { $eq: "cs-101" } },
        }),
      }),
    );
    expect(opts).not.toHaveProperty("next");
  });

  it.each([
    ["member", 10],
    ["admin", 11],
    ["manager", 12],
    ["creator", 13],
  ])("a %s revalidates exactly the per-group tag", async (_role, id) => {
    mockedRequireRole.mockResolvedValue(authFixtures.as({ id }));

    const res = await refreshGroup("cs-101");

    expect(res).toEqual({ ok: true });
    expect(revalidateTag).toHaveBeenCalledTimes(1);
    expect(revalidateTag).toHaveBeenCalledWith("group-cs-101");
  });

  it("a SysAdmin who is not in the group revalidates exactly the per-group tag", async () => {
    mockedRequireRole.mockResolvedValue(
      authFixtures.as({ id: 99, roles: [AuthorizedUserRoleTitle.SysAdmin] }),
    );

    const res = await refreshGroup("cs-101");

    expect(res).toEqual({ ok: true });
    expect(revalidateTag).toHaveBeenCalledTimes(1);
    expect(revalidateTag).toHaveBeenCalledWith("group-cs-101");
  });
});
