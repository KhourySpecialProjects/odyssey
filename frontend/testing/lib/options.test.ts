import { authOptions } from "@/lib/auth/options";
import { fetchIsAuthorizedUser } from "@/lib/requests/authorized-user";
import { fetchAPI } from "@/lib/utils";

jest.mock("@/lib/utils", () => ({
  fetchAPI: jest.fn(),
}));

jest.mock("@/lib/auth/azure", () => ({
  getUserProfile: jest.fn().mockResolvedValue({
    nuid: "12345",
    isActive: true
  })
}));

jest.mock("@/lib/requests/authorized-user", () => ({
  fetchIsAuthorizedUser: jest.fn(),
  getAuthorizedUserByEmail: jest.fn().mockResolvedValue({
    roles: [{ title: "User" }]
  })
}));

describe("options", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("callbacks", () => {
    it("should handle JWT callback", async () => {
      const mockToken = { user: { email: "test@test.com", roles: [], isActive: true } };
      const result = await authOptions.callbacks?.jwt?.({ 
        token: mockToken, 
        user: { email: "test@test.com", id: "1", emailVerified: new Date()},
        account: null,
        profile: undefined
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
        credentials: undefined
      });

      expect(result).toBe(true);
    });

    it("redirects unauthorized users", async () => {
      (fetchIsAuthorizedUser as jest.Mock).mockResolvedValue(false);

      const result = await authOptions.callbacks!.signIn!({
        user: { email: "test@test.com", id: "1", emailVerified: new Date() },
        account: null,
        profile: undefined,
        credentials: undefined
      });

      expect(result).toBe("/unauthorized");
    });

    it("rejects users without email", async () => {
      const result = await authOptions.callbacks!.signIn!({
        user: { email: null, id: "1", emailVerified: new Date() },
        account: null,
        profile: undefined,
        credentials: undefined
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
        emailVerified: new Date()
      };
      const account = { access_token: "test-token", providerAccountId: "1", provider: "test" as const, type: "oauth" as const };

      const result = await authOptions.callbacks!.jwt!({
        token,
        user,
        account,
        profile: undefined,
        trigger: "signIn"
      });

      expect(result).toEqual({
        user: {
          name: "Test User",
          email: "test@test.com",
          image: "test.jpg",
          nuid: "12345",
          isActive: true,
          roles: ["User"]
        }
      });
    });
  });

  it("throws error when token has no user data", async () => {
    const token = {};
    const session = { user: { roles: [], isActive: true },  expires: new Date().toISOString()};

    await expect(authOptions.callbacks!.session!({
      session,
      token,
      user: { id: "1", email: "test@test.com", emailVerified: new Date() },
      trigger: "update",
      newSession: undefined
    })).rejects.toThrow("No user data");
  });
});
});