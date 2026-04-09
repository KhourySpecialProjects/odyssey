import { z } from "zod";

const voyageNodeSchema = z.object({
  playlistId: z.number().int(),
  label: z.string().min(1),
  isMainPath: z.boolean(),
  branchType: z.enum(["required", "optional"]),
  parentPlaylistId: z.number().int().nullable(), // null = main path
  orderIndex: z.number().int(),
});

export const VoyageTreeSchema = z
  .object({
    name: z.string().min(1, "Voyage name is required"),
    description: z.string().optional(),
    nodes: z.array(voyageNodeSchema).min(1, "Add at least one playlist"),
  })
  .superRefine((data, ctx) => {
    const playlistIds = new Set(data.nodes.map((n) => n.playlistId));

    // No circular references: a node cannot be its own parent
    for (const node of data.nodes) {
      if (
        node.parentPlaylistId !== null &&
        node.parentPlaylistId === node.playlistId
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Node ${node.playlistId} references itself as own parent`,
          path: ["nodes"],
        });
      }
    }

    // Branch nodes must reference a parentPlaylistId that exists in the list
    for (const node of data.nodes) {
      if (
        node.parentPlaylistId !== null &&
        !playlistIds.has(node.parentPlaylistId)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Node ${node.playlistId} has parentPlaylistId ${node.parentPlaylistId} which does not exist in the nodes list`,
          path: ["nodes"],
        });
      }
    }

    // Max 8 main path nodes (parentPlaylistId === null)
    const mainNodes = data.nodes.filter((n) => n.parentPlaylistId === null);
    if (mainNodes.length > 8) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Maximum 8 main islands allowed",
        path: ["nodes"],
      });
    }

    // Max 4 branches per parent node
    const branchCounts = new Map<number, number>();
    for (const node of data.nodes) {
      if (node.parentPlaylistId !== null) {
        branchCounts.set(
          node.parentPlaylistId,
          (branchCounts.get(node.parentPlaylistId) ?? 0) + 1,
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
