import { authOptions } from "@/lib/auth/options";
import { fetchIsAuthorizedUser } from "@/lib/requests/authorized-user";
import { fetchAPI } from "@/lib/utils";
import { getUserPhoto } from "@/lib/auth/azure";
import { uploadImage, deleteImage } from "@/lib/actions";
import {
  strapiEntryUrl,
  StrapiEntryNotFoundError,
} from "@/lib/strapi-document-id";

jest.mock("@/lib/utils", () => ({
  fetchAPI: jest
    .fn()
    .mockResolvedValue([
      { id: 7, documentId: "abc123", roles: [{ title: "User" }] },
    ]),
}));

jest.mock("@/lib/auth/azure", () => ({
  getUserProfile: jest.fn().mockResolvedValue({
    nuid: "12345",
    isActive: true,
  }),
  getUserPhoto: jest.fn().mockResolvedValue(null),
}));

jest.mock("@/lib/actions", () => ({
  uploadImage: jest.fn(),
  deleteImage: jest.fn().mockResolvedValue({ ok: true }),
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
            documentId: "abc123",
            name: "Test User",
            email: "test@test.com",
            image: "test.jpg",
            nuid: "12345",
            isActive: true,
            roles: ["User"],
          },
        });
      });
    });

    describe("old (pre-documentId) tokens", () => {
      const oldToken = {
        user: {
          id: 7,
          email: "test@test.com",
          roles: ["User"],
          isActive: true,
        },
      };

      it("returns an old token unchanged on non-sign-in calls", async () => {
        const before = JSON.parse(JSON.stringify(oldToken));

        const result = await authOptions.callbacks!.jwt!({
          token: oldToken,
        } as any);

        expect(result).toEqual(before);
        expect(result).toBe(oldToken);
        expect(fetchAPI).not.toHaveBeenCalled();
      });

      it("session callback passes documentId through to session.user", async () => {
        const token = { user: { ...oldToken.user, documentId: "abc123" } };

        const result = await authOptions.callbacks!.session!({
          session: { expires: "" },
          token,
        } as any);

        expect(result.user).toEqual(token.user);
      });

      it("session callback accepts an old token without documentId", async () => {
        const result = await authOptions.callbacks!.session!({
          session: { expires: "" },
          token: oldToken,
        } as any);

        expect(result.user).toEqual(oldToken.user);
      });
    });

    describe("Azure profile photo sync (Strapi v5 documentIds)", () => {
      const azureAccount = {
        access_token: "test-token",
        providerAccountId: "1",
        provider: "azure-ad" as const,
        type: "oauth" as const,
      };
      const signedInUser = {
        name: "Test User",
        email: "test@test.com",
        image: "test.jpg",
        id: "1",
        emailVerified: new Date(),
      };

      beforeEach(() => {
        (fetchAPI as jest.Mock).mockResolvedValueOnce([
          {
            id: 7,
            documentId: "abc123",
            profilePhoto: null,
            roles: [{ title: "User" }],
          },
        ]);
        (getUserPhoto as jest.Mock).mockResolvedValueOnce(Buffer.from("img"));
        (uploadImage as jest.Mock).mockResolvedValueOnce({
          ok: true,
          url: "/uploads/uuid-photo.jpg",
        });
      });

      it("saves the photo with a PUT to the user's documentId, using the fetched entity (no lookup)", async () => {
        (strapiEntryUrl as jest.Mock).mockImplementationOnce(
          async (collection: string, ref: { documentId: string }) =>
            `http://strapi/api/${collection}/${ref.documentId}`,
        );
        (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });

        const result = await authOptions.callbacks!.jwt!({
          token: {},
          user: signedInUser,
          account: azureAccount,
          profile: undefined,
          trigger: "signIn",
        });

        expect(strapiEntryUrl).toHaveBeenCalledWith(
          "authorized-users",
          expect.objectContaining({ id: 7, documentId: "abc123" }),
        );
        expect(global.fetch).toHaveBeenCalledWith(
          "http://strapi/api/authorized-users/abc123",
          expect.objectContaining({ method: "PUT" }),
        );
        expect((result as any).user.image).toBe("/uploads/uuid-photo.jpg");
      });

      it("treats a missing user like the old 404: cleans up the upload and keeps the provider image", async () => {
        const consoleError = jest
          .spyOn(console, "error")
          .mockImplementation(() => {});
        (strapiEntryUrl as jest.Mock).mockRejectedValueOnce(
          new StrapiEntryNotFoundError("gone"),
        );

        const result = await authOptions.callbacks!.jwt!({
          token: {},
          user: signedInUser,
          account: azureAccount,
          profile: undefined,
          trigger: "signIn",
        });

        expect(global.fetch).not.toHaveBeenCalled();
        expect(deleteImage).toHaveBeenCalledWith("uuid-photo.jpg");
        expect(consoleError).toHaveBeenCalledWith(
          "Strapi profile photo save failed:",
          404,
        );
        expect((result as any).user.image).toBe("test.jpg");
        consoleError.mockRestore();
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
