import { getCurrentUser } from "@/lib/auth/session";
import { giveKudos } from "@/lib/kudos";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { fetchAPI } from "@/lib/utils";
import { notFound } from "next/navigation";

jest.mock("@/lib/utils", () => ({
  fetchAPI: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  notFound: jest.fn(),
}));

jest.mock("@/lib/auth/session", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("@/lib/requests/authorized-user", () => ({
  getAuthorizedUserByEmail: jest.fn(),
}));

jest.mock("next-auth/next", () => ({
  getServerSession: jest
    .fn()
    .mockResolvedValue({ user: { email: "test@test.com" } }),
}));

describe("kudos", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createKudos", () => {
    it("should successfully create kudos", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue({
        email: "test@test.com",
      });

      (getAuthorizedUserByEmail as jest.Mock).mockResolvedValue({
        id: 1,
        email: "test@test.com",
      });

      const mockResponse = { data: { id: 1 }, ok: true };
      (fetchAPI as jest.Mock).mockResolvedValue(mockResponse);

      await giveKudos(1, {
        id: 1,
        name: "Test Droplet",
        slug: "test-droplet",
        isHidden: false,
        focusArea: "personal",
        type: "knowledge",
        status: "published",
        learningObjectives: [],
      } as any);

      expect(getCurrentUser).toHaveBeenCalled();
      expect(getAuthorizedUserByEmail).toHaveBeenCalledWith("test@test.com", {
        fields: ["id", "email", "firstName", "lastName"],
      });
    });

    it("calls notFound when user is not found", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(null);

      await giveKudos(1, {
        id: 1,
        name: "Test Droplet",
        slug: "test-droplet",
        isHidden: false,
        focusArea: "personal",
        type: "knowledge",
        status: "published",
        learningObjectives: [],
      } as any);

      expect(notFound).toHaveBeenCalled();
    });
  });
});
