import { getCurrentUser } from "@/lib/auth/session";
import { getServerSession } from "next-auth";

jest.mock("next-auth/next", () => ({
  getServerSession: jest
    .fn()
    .mockResolvedValue({ user: { email: "test@test.com" } }),
}));

describe("session", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getCurrentUser", () => {
    it("should return user when session exists", async () => {
      const mockUser = { id: 1, email: "test@test.com" };
      (getServerSession as jest.Mock).mockResolvedValue({ user: mockUser });

      const result = await getCurrentUser();

      expect(result).toEqual(mockUser);
    });
  });
});
