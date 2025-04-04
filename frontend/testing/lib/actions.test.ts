// actions.test.ts
import { fetchAPI } from "@/lib/utils";
import {
  updateDroplet,
  updateLesson,
  deleteLesson,
  archiveGroup,
} from "@/lib/actions";

jest.mock("@/lib/utils", () => ({
  fetchAPI: jest.fn(),
}));

describe("actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("updateDroplet", () => {
    it("should handle update failure", async () => {
      (fetchAPI as jest.Mock).mockRejectedValue(new Error("Update failed"));

      const result = await updateDroplet(1, { name: "Updated Droplet" });

      expect(result).toEqual({
        ok: false,
        error: "Database Error: Failed to update droplet.",
        data: null,
      });
    });
  });
});
