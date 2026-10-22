import { authOptions } from "@/lib/auth/options";
import { fetchIsAuthorizedUser } from "@/lib/requests/authorized-user";
import { fetchAPI } from "@/lib/utils";
import { CACHE_TAGS } from "@/lib/cache-tags";

jest.mock("@/lib/utils", () => ({
  fetchAPI: jest
    .fn()
    .mockResolvedValue([{ id: 7, roles: [{ title: "User" }] }]),
}));

jest.mock("@/lib/auth/azure", () => ({
  getUserProfile: jest.fn().mockResolvedValue({
    nuid: "12345",
    isActive: true,
  }),
  getUserPhoto: jest.fn().mockResolvedValue(null),
}));

jest.mock("@/lib/requests/authorized-user", () => ({
  fetchIsAuthorizedUser: jest.fn(),
  getAuthorizedUserByEmail: jest.fn().mockResolvedValue({
    roles: [{ title: "User" }],
  }),
}));

describe("options", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("callbacks", () => {
    it("should handle JWT callback", async () => {
      const mockToken = {
        user: { email: "test@test.com", roles: [], isActive: true },
      };
      const result = await authOptions.callbacks?.jwt?.({
        token: mockToken,
        user: { email: "test@test.com", id: "1", emailVerified: new Date() },
        account: null,
        profile: undefined,
      });
      expect(result).toEqual(mockToken);
    });
  });

  describe("auth options", () => {
    describe("signIn callback", () => {
      it("allows authorized users to sign in", async () => {
        (fetchIsAuthorizedUser as jest.Mock).mockResolvedValue(true);

        const result = await authOptions.callbacks!.signIn!({
          user: { email: "test@test.com", id: "1", emailVerified: new Date() },
          account: null,
          profile: undefined,
          credentials: undefined,
        });

        expect(result).toBe(true);
      });

      it("redirects unauthorized users", async () => {
        (fetchIsAuthorizedUser as jest.Mock).mockResolvedValue(false);

        const result = await authOptions.callbacks!.signIn!({
          user: { email: "test@test.com", id: "1", emailVerified: new Date() },
          account: null,
          profile: undefined,
          credentials: undefined,
        });

        expect(result).toBe(`/unauthorized`);
      });

      it("rejects users without email", async () => {
        const result = await authOptions.callbacks!.signIn!({
          user: { email: null, id: "1", emailVerified: new Date() },
          account: null,
          profile: undefined,
          credentials: undefined,
        });

        expect(result).toBe(false);
      });
    });

    describe("jwt callback", () => {
      it("enriches token with user details", async () => {
        const token = {};
        const user = {
          name: "Test User",
          email: "test@test.com",
          image: "test.jpg",
          id: "1",
          emailVerified: new Date(),
        };
        const account = {
          access_token: "test-token",
          providerAccountId: "1",
          provider: "azure-ad" as const,
          type: "oauth" as const,
        };

        const result = await authOptions.callbacks!.jwt!({
          token,
          user,
          account,
          profile: undefined,
          trigger: "signIn",
        });

        expect(result).toEqual({
          user: {
            id: 7,
            name: "Test User",
            email: "test@test.com",
            image: "test.jpg",
            nuid: "12345",
            isActive: true,
            roles: ["User"],
          },
          userIdCheckedAt: expect.any(Number),
        });
      });
    });

    describe("jwt callback account id re-check", () => {
      const NOW = new Date("2026-01-01T00:00:00Z").getTime();
      const INTERVAL = 5 * 60 * 1000;
      const mockFetchAPI = fetchAPI as jest.Mock;
      const baseUser = {
        id: 7,
        email: "test@test.com",
        roles: ["User"],
        isActive: true,
      };
      const callJwt = (token: Record<string, unknown>) =>
        authOptions.callbacks!.jwt!({
          token,
          trigger: "update",
        } as Parameters<
          NonNullable<NonNullable<typeof authOptions.callbacks>["jwt"]>
        >[0]);

      beforeEach(() => {
        jest.useFakeTimers().setSystemTime(NOW);
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      it("records the check time on the top-level token at sign-in", async () => {
        const result = await authOptions.callbacks!.jwt!({
          token: {},
          user: {
            name: "T",
            email: "test@test.com",
            id: "1",
            emailVerified: new Date(),
          },
          account: null,
          profile: undefined,
          trigger: "signIn",
        });

        expect(result.user).toEqual(expect.objectContaining({ id: 7 }));
        expect(result.user).not.toHaveProperty("userIdCheckedAt");
        expect(result.userIdCheckedAt).toBe(NOW);
      });

      it("makes no lookup within the interval", async () => {
        const token = { user: baseUser, userIdCheckedAt: NOW - INTERVAL + 1 };

        const result = await callJwt({ ...token });

        expect(mockFetchAPI).not.toHaveBeenCalled();
        expect(result).toEqual(token);
      });

      it("keeps the id and updates the check time when unchanged", async () => {
        mockFetchAPI.mockResolvedValueOnce([{ id: 7 }]);

        const result = await callJwt({
          user: baseUser,
          userIdCheckedAt: NOW - INTERVAL - 1,
        });

        expect(mockFetchAPI).toHaveBeenCalledTimes(1);
        expect(result.user).toEqual(baseUser);
        expect(result.userIdCheckedAt).toBe(NOW);
      });

      it("updates the id when the account was re-created", async () => {
        mockFetchAPI.mockResolvedValueOnce([{ id: 99 }]);

        const result = await callJwt({
          user: baseUser,
          userIdCheckedAt: NOW - INTERVAL - 1,
        });

        expect(result.user).toEqual({ ...baseUser, id: 99 });
        expect(result.userIdCheckedAt).toBe(NOW);
      });

      it("removes the id when the account no longer exists", async () => {
        mockFetchAPI.mockResolvedValueOnce([]);

        const result = await callJwt({
          user: baseUser,
          userIdCheckedAt: NOW - INTERVAL - 1,
        });

        expect((result.user as { id?: number }).id).toBeUndefined();
        expect((result.user as { email?: string }).email).toBe("test@test.com");
        expect(result.userIdCheckedAt).toBe(NOW);
      });

      it("adds an id to pre-ODY-555 tokens", async () => {
        mockFetchAPI.mockResolvedValueOnce([{ id: 12 }]);
        const { id: _omit, ...noId } = baseUser;

        const result = await callJwt({ user: noId });

        expect(result.user).toEqual({ ...noId, id: 12 });
        expect(result.userIdCheckedAt).toBe(NOW);
      });

      it("leaves the token unchanged when the lookup throws", async () => {
        const errorSpy = jest
          .spyOn(console, "error")
          .mockImplementation(() => {});
        mockFetchAPI.mockRejectedValueOnce(new Error("Strapi down"));
        const checkedAt = NOW - INTERVAL - 1;

        const result = await callJwt({
          user: baseUser,
          userIdCheckedAt: checkedAt,
        });

        expect(result.user).toEqual(baseUser);
        expect(result.userIdCheckedAt).toBe(checkedAt);
        expect(errorSpy).toHaveBeenCalled();
        errorSpy.mockRestore();
      });

      it("looks up by email with data-cache tags and no cache option", async () => {
        mockFetchAPI.mockResolvedValueOnce([{ id: 7 }]);

        await callJwt({ user: baseUser, userIdCheckedAt: NOW - INTERVAL - 1 });

        expect(mockFetchAPI).toHaveBeenCalledWith("/authorized-users", {
          urlParams: {
            filters: { email: { $eq: "test@test.com" } },
            fields: ["id"],
            pagination: { pageSize: 1, page: 1 },
          },
          next: { revalidate: 900, tags: [CACHE_TAGS.users] },
        });
        expect(mockFetchAPI.mock.calls[0][1]).not.toHaveProperty("cache");
      });
    });

    it("throws error when token has no user data", async () => {
      const token = {};
      const session = {
        user: { roles: [], isActive: true },
        expires: new Date().toISOString(),
      };

      await expect(
        authOptions.callbacks!.session!({
          session,
          token,
          user: { id: "1", email: "test@test.com", emailVerified: new Date() },
          trigger: "update",
          newSession: undefined,
        }),
      ).rejects.toThrow("No user data");
    });
  });
});
