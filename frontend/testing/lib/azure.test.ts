import { getUserProfile } from "@/lib/auth/azure";
import  AzureADProvider  from "next-auth/providers/azure-ad";

describe("azure", () => {
  describe("AzureADProvider", () => {
    const provider = AzureADProvider({
      clientId: "test",
      clientSecret: "test"
    });
    
    it("should have correct configuration", () => {
      expect(provider.id).toBe("azure-ad");
      expect(provider.name).toBe("Azure Active Directory");
      expect(provider.type).toBe("oauth");
    });
  });

describe("azure", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  describe("getUserProfile", () => {
    it("successfully fetches user profile", async () => {
      const mockResponse = {
        employeeId: "12345",
      };
      
      (global.fetch as jest.Mock).mockResolvedValue({
        json: () => Promise.resolve(mockResponse)
      });

      const result = await getUserProfile("test-token");

      expect(global.fetch).toHaveBeenCalledWith(
        "https://graph.microsoft.com/v1.0/me?$select=employeeId",
        {
          headers: {
            Authorization: "Bearer test-token"
          }
        }
      );
      expect(result).toEqual({
        nuid: "12345",
        isActive: true
      });
    });

    it("handles fetch error", async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error("Network error"));

      await expect(getUserProfile("test-token")).rejects.toThrow("Failed to fetch user profile");
    });
  })
});
});