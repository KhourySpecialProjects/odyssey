import { z } from "zod";

const voyageNodeSchema = z
  .object({
    localId: z.string().min(1),
    nodeType: z.enum(["playlist", "droplet"]),
    playlistId: z.number().int().nullable(),
    dropletId: z.number().int().nullable(),
    label: z.string().min(1),
    isMainPath: z.boolean(),
    branchType: z.enum(["required", "optional"]),
    parentLocalId: z.string().nullable(), // null = main path
    orderIndex: z.number().int(),
  })
  .superRefine((node, ctx) => {
    if (node.nodeType === "playlist" && node.playlistId === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Playlist nodes must have a playlist selected",
        path: ["playlistId"],
      });
    }
    // droplet nodes can have null dropletId (placeholder)
  });

export const VoyageTreeSchema = z
  .object({
    name: z.string().min(1, "Voyage name is required"),
    description: z.string().optional(),
    nodes: z
      .array(voyageNodeSchema)
      .min(1, "Add at least one playlist or droplet"),
  })
  .superRefine((data, ctx) => {
    const localIds = new Set(data.nodes.map((n) => n.localId));

    // No circular references: a node cannot be its own parent
    for (const node of data.nodes) {
      if (node.parentLocalId !== null && node.parentLocalId === node.localId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Node "${node.label}" references itself as own parent`,
          path: ["nodes"],
        });
      }
    }

    // Branch nodes must reference a parentLocalId that exists in the list
    for (const node of data.nodes) {
      if (node.parentLocalId !== null && !localIds.has(node.parentLocalId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Node "${node.label}" has a parent that does not exist in the nodes list`,
          path: ["nodes"],
        });
      }
    }

    // Branch nodes must point to a main-path parent — nested branches are
    // not supported (the deletion code assumes a flat main/branch structure).
    const nodeByLocalId = new Map(data.nodes.map((n) => [n.localId, n]));
    for (const node of data.nodes) {
      if (node.parentLocalId === null) continue;
      const parent = nodeByLocalId.get(node.parentLocalId);
      if (parent && !parent.isMainPath) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Node "${node.label}" has a branch parent; branches must attach to a main-path node`,
          path: ["nodes"],
        });
      }
    }

    // Max 8 main path nodes (parentLocalId === null)
    const mainNodes = data.nodes.filter((n) => n.parentLocalId === null);
    if (mainNodes.length > 8) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Maximum 8 main islands allowed",
        path: ["nodes"],
      });
    }

    // Max 4 branches per parent node
    const branchCounts = new Map<string, number>();
    for (const node of data.nodes) {
      if (node.parentLocalId !== null) {
        branchCounts.set(
          node.parentLocalId,
          (branchCounts.get(node.parentLocalId) ?? 0) + 1,
        );
      }
    }
    for (const [, count] of branchCounts) {
      if (count > 4) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "A main island has more than 4 branches (max 4 per island)",
          path: ["nodes"],
        });
      }
    }
  });

// voyageSchema is an alias for VoyageTreeSchema (backwards-compatible rename).
// All new code should import VoyageTreeSchema directly.
export const voyageSchema = VoyageTreeSchema;

export type VoyageFormData = z.infer<typeof VoyageTreeSchema>;
