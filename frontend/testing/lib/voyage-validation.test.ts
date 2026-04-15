import { voyageSchema, VoyageTreeSchema } from "@/lib/validations/voyage";

// Helper: build a minimal valid node using localId-based identity
const makeNode = (
  localId: string,
  parentLocalId: string | null = null,
  orderIndex: number = 0,
) => ({
  localId,
  nodeType: "playlist" as const,
  playlistId: parseInt(localId.replace(/\D/g, "") || "1"),
  dropletId: null,
  label: `Island ${localId}`,
  isMainPath: parentLocalId === null,
  branchType: "required" as const,
  parentLocalId,
  orderIndex,
});

describe("VoyageTreeSchema", () => {
  describe("name validation", () => {
    it("rejects empty name", () => {
      const result = VoyageTreeSchema.safeParse({
        name: "",
        nodes: [makeNode("1")],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toMatch(/required/i);
      }
    });

    it("accepts a valid name", () => {
      const result = VoyageTreeSchema.safeParse({
        name: "ML Fundamentals",
        nodes: [makeNode("1")],
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
        nodes: [makeNode("1")],
      });
      expect(result.success).toBe(true);
    });
  });

  describe("max 8 main path nodes", () => {
    it("accepts exactly 8 main nodes", () => {
      const nodes = Array.from({ length: 8 }, (_, i) =>
        makeNode(String(i + 1), null, i),
      );
      const result = VoyageTreeSchema.safeParse({ name: "Test", nodes });
      expect(result.success).toBe(true);
    });

    it("rejects 9 main nodes", () => {
      const nodes = Array.from({ length: 9 }, (_, i) =>
        makeNode(String(i + 1), null, i),
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
        makeNode("1", null, 0), // main node, localId="1"
        makeNode("2", "1", 0),
        makeNode("3", "1", 1),
        makeNode("4", "1", 2),
        makeNode("5", "1", 3),
      ];
      const result = VoyageTreeSchema.safeParse({ name: "Test", nodes });
      expect(result.success).toBe(true);
    });

    it("rejects 5 branches on one parent", () => {
      const nodes = [
        makeNode("1", null, 0),
        makeNode("2", "1", 0),
        makeNode("3", "1", 1),
        makeNode("4", "1", 2),
        makeNode("5", "1", 3),
        makeNode("6", "1", 4),
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
        makeNode("1", null, 0),
        makeNode("2", null, 1),
        // 4 branches on node 1
        makeNode("10", "1", 0),
        makeNode("11", "1", 1),
        makeNode("12", "1", 2),
        makeNode("13", "1", 3),
        // 4 branches on node 2
        makeNode("20", "2", 0),
        makeNode("21", "2", 1),
        makeNode("22", "2", 2),
        makeNode("23", "2", 3),
      ];
      const result = VoyageTreeSchema.safeParse({ name: "Test", nodes });
      expect(result.success).toBe(true);
    });
  });

  describe("no circular references", () => {
    it("rejects a node that is its own parent", () => {
      // node with localId="node-a" has parentLocalId="node-a" (self-reference)
      const nodes = [
        {
          localId: "node-a",
          nodeType: "playlist" as const,
          playlistId: 1,
          dropletId: null,
          label: "Self-referencing",
          isMainPath: false,
          branchType: "required" as const,
          parentLocalId: "node-a",
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

  describe("valid parentLocalId for branch nodes", () => {
    it("rejects a branch node whose parentLocalId does not exist", () => {
      const nodes = [
        makeNode("1", null, 0),
        // parentLocalId="999" doesn't exist in the nodes list
        makeNode("2", "999", 0),
      ];
      const result = VoyageTreeSchema.safeParse({ name: "Test", nodes });
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message);
        expect(messages.some((m) => /parent/i.test(m))).toBe(true);
      }
    });

    it("accepts a branch node whose parentLocalId exists", () => {
      const nodes = [makeNode("1", null, 0), makeNode("2", "1", 0)];
      const result = VoyageTreeSchema.safeParse({ name: "Test", nodes });
      expect(result.success).toBe(true);
    });
  });

  describe("optional description", () => {
    it("accepts no description", () => {
      const result = VoyageTreeSchema.safeParse({
        name: "Test Voyage",
        nodes: [makeNode("1")],
      });
      expect(result.success).toBe(true);
    });

    it("accepts a description", () => {
      const result = VoyageTreeSchema.safeParse({
        name: "Test Voyage",
        description: "Learn the basics.",
        nodes: [makeNode("1")],
      });
      expect(result.success).toBe(true);
    });
  });

  describe("droplet node support", () => {
    it("accepts a droplet node with a dropletId", () => {
      const result = VoyageTreeSchema.safeParse({
        name: "Test Voyage",
        nodes: [
          {
            localId: "node-1",
            nodeType: "droplet" as const,
            playlistId: null,
            dropletId: 42,
            label: "My Droplet",
            isMainPath: true,
            branchType: "required" as const,
            parentLocalId: null,
            orderIndex: 0,
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("accepts a placeholder droplet node (no dropletId)", () => {
      const result = VoyageTreeSchema.safeParse({
        name: "Test Voyage",
        nodes: [
          {
            localId: "node-1",
            nodeType: "droplet" as const,
            playlistId: null,
            dropletId: null,
            label: "Unclaimed Placeholder",
            isMainPath: true,
            branchType: "required" as const,
            parentLocalId: null,
            orderIndex: 0,
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("rejects a playlist node with a null playlistId", () => {
      const result = VoyageTreeSchema.safeParse({
        name: "Test Voyage",
        nodes: [
          {
            localId: "node-1",
            nodeType: "playlist" as const,
            playlistId: null,
            dropletId: null,
            label: "Missing Playlist",
            isMainPath: true,
            branchType: "required" as const,
            parentLocalId: null,
            orderIndex: 0,
          },
        ],
      });
      expect(result.success).toBe(false);
    });

    it("accepts mixed playlist and droplet nodes", () => {
      const result = VoyageTreeSchema.safeParse({
        name: "Mixed Voyage",
        nodes: [
          {
            localId: "playlist-node",
            nodeType: "playlist" as const,
            playlistId: 1,
            dropletId: null,
            label: "Playlist Island",
            isMainPath: true,
            branchType: "required" as const,
            parentLocalId: null,
            orderIndex: 0,
          },
          {
            localId: "droplet-node",
            nodeType: "droplet" as const,
            playlistId: null,
            dropletId: 99,
            label: "Droplet Island",
            isMainPath: true,
            branchType: "required" as const,
            parentLocalId: null,
            orderIndex: 1,
          },
        ],
      });
      expect(result.success).toBe(true);
    });
  });
});

// Legacy schema still works for backwards compatibility
describe("voyageSchema (legacy)", () => {
  it("validates localId-based structure", () => {
    const result = voyageSchema.safeParse({
      name: "ML Fundamentals",
      nodes: [makeNode("1")],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = voyageSchema.safeParse({
      name: "",
      nodes: [makeNode("1")],
    });
    expect(result.success).toBe(false);
  });
});
