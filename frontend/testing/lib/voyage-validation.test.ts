import { voyageSchema, VoyageTreeSchema } from "@/lib/validations/voyage";

// Helper: build a minimal valid node
const makeNode = (
  playlistId: number,
  parentPlaylistId: number | null = null,
  orderIndex: number = 0,
) => ({
  playlistId,
  label: `Island ${playlistId}`,
  isMainPath: parentPlaylistId === null,
  branchType: "required" as const,
  parentPlaylistId,
  orderIndex,
});

describe("VoyageTreeSchema", () => {
  describe("name validation", () => {
    it("rejects empty name", () => {
      const result = VoyageTreeSchema.safeParse({
        name: "",
        nodes: [makeNode(1)],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toMatch(/required/i);
      }
    });

    it("accepts a valid name", () => {
      const result = VoyageTreeSchema.safeParse({
        name: "ML Fundamentals",
        nodes: [makeNode(1)],
      });
      expect(result.success).toBe(true);
    });
  });

  describe("nodes array validation", () => {
    it("rejects empty nodes array", () => {
      const result = VoyageTreeSchema.safeParse({
        name: "Test Voyage",
        nodes: [],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message);
        expect(messages.some((m) => /at least one/i.test(m))).toBe(true);
      }
    });

    it("accepts a single main node", () => {
      const result = VoyageTreeSchema.safeParse({
        name: "Test Voyage",
        nodes: [makeNode(1)],
      });
      expect(result.success).toBe(true);
    });
  });

  describe("max 8 main path nodes", () => {
    it("accepts exactly 8 main nodes", () => {
      const nodes = Array.from({ length: 8 }, (_, i) =>
        makeNode(i + 1, null, i),
      );
      const result = VoyageTreeSchema.safeParse({ name: "Test", nodes });
      expect(result.success).toBe(true);
    });

    it("rejects 9 main nodes", () => {
      const nodes = Array.from({ length: 9 }, (_, i) =>
        makeNode(i + 1, null, i),
      );
      const result = VoyageTreeSchema.safeParse({ name: "Test", nodes });
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message);
        expect(messages.some((m) => /8 main/i.test(m))).toBe(true);
      }
    });
  });

  describe("max 4 branches per parent", () => {
    it("accepts exactly 4 branches on one parent", () => {
      const nodes = [
        makeNode(1, null, 0), // main node, playlistId=1
        makeNode(2, 1, 0),
        makeNode(3, 1, 1),
        makeNode(4, 1, 2),
        makeNode(5, 1, 3),
      ];
      const result = VoyageTreeSchema.safeParse({ name: "Test", nodes });
      expect(result.success).toBe(true);
    });

    it("rejects 5 branches on one parent", () => {
      const nodes = [
        makeNode(1, null, 0),
        makeNode(2, 1, 0),
        makeNode(3, 1, 1),
        makeNode(4, 1, 2),
        makeNode(5, 1, 3),
        makeNode(6, 1, 4),
      ];
      const result = VoyageTreeSchema.safeParse({ name: "Test", nodes });
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message);
        expect(messages.some((m) => /4 branch/i.test(m))).toBe(true);
      }
    });

    it("allows 4 branches on each of multiple parents", () => {
      const nodes = [
        makeNode(1, null, 0),
        makeNode(2, null, 1),
        // 4 branches on node 1
        makeNode(10, 1, 0),
        makeNode(11, 1, 1),
        makeNode(12, 1, 2),
        makeNode(13, 1, 3),
        // 4 branches on node 2
        makeNode(20, 2, 0),
        makeNode(21, 2, 1),
        makeNode(22, 2, 2),
        makeNode(23, 2, 3),
      ];
      const result = VoyageTreeSchema.safeParse({ name: "Test", nodes });
      expect(result.success).toBe(true);
    });
  });

  describe("no circular references", () => {
    it("rejects a node that is its own parent", () => {
      // node with playlistId=1 has parentPlaylistId=1 (self-reference)
      const nodes = [
        {
          playlistId: 1,
          label: "Self-referencing",
          isMainPath: false,
          branchType: "required" as const,
          parentPlaylistId: 1,
          orderIndex: 0,
        },
      ];
      const result = VoyageTreeSchema.safeParse({ name: "Test", nodes });
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message);
        expect(messages.some((m) => /circular|own parent/i.test(m))).toBe(true);
      }
    });
  });

  describe("valid parentPlaylistId for branch nodes", () => {
    it("rejects a branch node whose parentPlaylistId does not exist", () => {
      const nodes = [
        makeNode(1, null, 0),
        // parentPlaylistId=999 doesn't exist in the nodes list
        makeNode(2, 999, 0),
      ];
      const result = VoyageTreeSchema.safeParse({ name: "Test", nodes });
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message);
        expect(messages.some((m) => /parent/i.test(m))).toBe(true);
      }
    });

    it("accepts a branch node whose parentPlaylistId exists", () => {
      const nodes = [makeNode(1, null, 0), makeNode(2, 1, 0)];
      const result = VoyageTreeSchema.safeParse({ name: "Test", nodes });
      expect(result.success).toBe(true);
    });
  });

  describe("optional description", () => {
    it("accepts no description", () => {
      const result = VoyageTreeSchema.safeParse({
        name: "Test Voyage",
        nodes: [makeNode(1)],
      });
      expect(result.success).toBe(true);
    });

    it("accepts a description", () => {
      const result = VoyageTreeSchema.safeParse({
        name: "Test Voyage",
        description: "Learn the basics.",
        nodes: [makeNode(1)],
      });
      expect(result.success).toBe(true);
    });
  });
});

// Legacy schema still works for backwards compatibility
describe("voyageSchema (legacy)", () => {
  it("validates legacy playlists-based structure", () => {
    const result = voyageSchema.safeParse({
      name: "ML Fundamentals",
      nodes: [makeNode(1)],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = voyageSchema.safeParse({
      name: "",
      nodes: [makeNode(1)],
    });
    expect(result.success).toBe(false);
  });
});
