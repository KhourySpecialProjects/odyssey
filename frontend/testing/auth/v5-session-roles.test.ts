/**
 * ODY-600 (AC1, AC2): sign in -> session -> requireRole -> a gated write, per
 * role, plus sessions created before documentId was added to the token.
 */
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/options";
import { requireRole } from "@/lib/auth/require-role";
import { setTimeZone } from "@/lib/actions";
import { fetchIsAuthorizedUser } from "@/lib/requests/authorized-user";
import { getCachedUser } from "@/lib/requests/cached";
import { fetchAPI } from "@/lib/utils";
import { clearDocumentIdCache } from "@/lib/strapi-document-id";
import { AuthorizedUserRoleTitle } from "@/lib/globals";
import type { User } from "@/types";

jest.unmock("@/lib/strapi-document-id");

jest.mock("next-auth/next", () => ({ getServerSession: jest.fn() }));
jest.mock("next/headers", () => ({ cookies: jest.fn() }));
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}));
jest.mock("next/navigation", () => ({ redirect: jest.fn() }));
jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn(),
  PutObjectCommand: jest.fn(),
  DeleteObjectCommand: jest.fn(),
}));
jest.mock("@anthropic-ai/sdk", () => jest.fn());
jest.mock("@/lib/auth/azure", () => ({
  getUserProfile: jest.fn(),
  getUserPhoto: jest.fn(),
}));
jest.mock("@/lib/requests/authorized-user", () => ({
  fetchIsAuthorizedUser: jest.fn(),
  createAuthorizedUser: jest.fn(),
}));
jest.mock("@/lib/requests/cached", () => ({ getCachedUser: jest.fn() }));
jest.mock("@/lib/utils", () => ({
  ...jest.requireActual("@/lib/utils"),
  fetchAPI: jest.fn(),
}));

const EMAIL = "student@northeastern.edu";
const PUT_URL = /\/api\/authorized-users\/abc123$/;
const ROLES = Object.values(AuthorizedUserRoleTitle);

const mockedGetServerSession = jest.mocked(getServerSession);
const mockedGetCachedUser = jest.mocked(getCachedUser);
const mockedFetchAPI = jest.mocked(fetchAPI);

function strapiUser(title: AuthorizedUserRoleTitle) {
  return {
    id: 7,
    documentId: "abc123",
    email: EMAIL,
    roles: [{ id: 1, title }],
  } as unknown as Awaited<ReturnType<typeof getCachedUser>>;
}

/** Runs the real jwt -> session callbacks, as NextAuth does on sign-in. */
async function signIn(title: AuthorizedUserRoleTitle) {
  mockedFetchAPI.mockResolvedValue([
    {
      id: 7,
      documentId: "abc123",
      profilePhoto: null,
      roles: [{ title }],
    },
  ]);
  const token = await authOptions.callbacks!.jwt!({
    token: {},
    user: { id: "gh1", email: EMAIL, name: "Stu", image: "i.jpg" },
    account: { provider: "github", providerAccountId: "1", type: "oauth" },
    trigger: "signIn",
  } as any);
  return authOptions.callbacks!.session!({
    session: { expires: "" },
    token,
  } as any);
}

/** Runs the session callback on a token issued before documentId existed. */
async function oldSession(user: Partial<User>) {
  return authOptions.callbacks!.session!({
    session: { expires: "" },
    token: { user: { email: EMAIL, roles: [], isActive: true, ...user } },
  } as any);
}

beforeEach(() => {
  clearDocumentIdCache();
  mockedGetServerSession.mockReset();
  mockedGetCachedUser.mockReset();
  mockedFetchAPI.mockReset();
  (global.fetch as jest.Mock).mockReset();
  (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
});

describe("unauthorized user", () => {
  it("is sent to /unauthorized at sign-in", async () => {
    (fetchIsAuthorizedUser as jest.Mock).mockResolvedValue(false);

    const result = await authOptions.callbacks!.signIn!({
      user: { id: "gh1", email: EMAIL },
    } as any);

    expect(result).toBe("/unauthorized");
  });

  it("has no session, so the gate and setTimeZone refuse without a write", async () => {
    mockedGetServerSession.mockResolvedValue(null);

    expect(await requireRole([])).toEqual({
      ok: false,
      error: "unauthenticated",
    });
    expect(await setTimeZone("America/New_York")).toEqual({
      ok: false,
      error: "unauthenticated",
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe.each(ROLES)("signed-in %s", (title) => {
  const notHeld =
    title === AuthorizedUserRoleTitle.SysAdmin
      ? AuthorizedUserRoleTitle.User
      : AuthorizedUserRoleTitle.SysAdmin;

  beforeEach(async () => {
    const session = await signIn(title);
    mockedGetServerSession.mockResolvedValue(session);
    mockedGetCachedUser.mockResolvedValue(strapiUser(title));
    mockedFetchAPI.mockClear();
  });

  it("carries id and documentId in the session", async () => {
    const session = await signIn(title);

    expect(session.user).toMatchObject({
      id: 7,
      documentId: "abc123",
      roles: [title],
    });
  });

  it("passes the gate for its own role with documentId", async () => {
    expect(await requireRole([title])).toMatchObject({
      ok: true,
      user: { id: 7, documentId: "abc123", roles: [title] },
    });
    expect(mockedGetCachedUser).toHaveBeenCalledWith(EMAIL);
  });

  it("is forbidden for a role it does not hold", async () => {
    expect(await requireRole([notHeld])).toEqual({
      ok: false,
      error: "forbidden",
    });
  });

  it("setTimeZone PUTs to its documentId with no lookup", async () => {
    mockedFetchAPI.mockClear();
    const result = await setTimeZone("America/New_York");

    expect(result).toEqual({ success: true });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching(PUT_URL),
      expect.objectContaining({ method: "PUT" }),
    );
    expect(mockedFetchAPI).not.toHaveBeenCalled();
  });
});

describe.each([
  ["a token with id but no documentId", { id: 7 }],
  ["a token with neither id nor documentId", {}],
])("old session: %s", (_label, tokenUser) => {
  beforeEach(() => {
    mockedGetCachedUser.mockResolvedValue(
      strapiUser(AuthorizedUserRoleTitle.User),
    );
  });

  it("does not throw in the session callback", async () => {
    await expect(oldSession(tokenUser)).resolves.toMatchObject({
      user: { email: EMAIL },
    });
  });

  it("gets documentId from the gate's email lookup and writes to it", async () => {
    mockedGetServerSession.mockResolvedValue(await oldSession(tokenUser));

    const gate = await requireRole([AuthorizedUserRoleTitle.User]);
    const result = await setTimeZone("America/New_York");

    expect(gate).toMatchObject({ ok: true, user: { documentId: "abc123" } });
    expect(mockedGetCachedUser).toHaveBeenCalledWith(EMAIL);
    expect(result).toEqual({ success: true });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching(PUT_URL),
      expect.objectContaining({ method: "PUT" }),
    );
  });
});

describe("old session: gate user has only a numeric id", () => {
  it("resolves documentId by id lookup and writes to it", async () => {
    mockedGetCachedUser.mockResolvedValue({
      id: 7,
      email: EMAIL,
      roles: [{ id: 1, title: AuthorizedUserRoleTitle.User }],
    } as unknown as Awaited<ReturnType<typeof getCachedUser>>);
    mockedFetchAPI.mockResolvedValue([{ id: 7, documentId: "abc123" }]);
    mockedGetServerSession.mockResolvedValue(await oldSession({ id: 7 }));

    const result = await setTimeZone("America/New_York");

    expect(result).toEqual({ success: true });
    expect(mockedFetchAPI).toHaveBeenCalledWith(
      "/authorized-users",
      expect.objectContaining({
        urlParams: expect.objectContaining({
          filters: { id: { $eq: 7 } },
        }),
      }),
    );
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching(PUT_URL),
      expect.objectContaining({ method: "PUT" }),
    );
  });
});
