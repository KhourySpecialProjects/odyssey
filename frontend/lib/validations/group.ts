import { z } from "zod";

export const GroupSchema = z.object({
  id: z.number(),
  groupName: z.string().min(1, "Group name is required"),
  description: z.string().optional(),
  semester: z.string().optional(),
  isArchived: z.boolean().optional().default(false),
  slug: z.string().optional(),
  members: z.array(z.any()).optional(),
  admins: z.array(z.number()).optional(),
  managers: z.array(z.number()).optional(),
  droplets: z.array(z.any()).optional(),
  playlists: z.array(z.any()).optional(),
});
