import { z } from "zod";

export const voyageSchema = z.object({
  name: z.string().min(1, "Voyage name is required").max(100),
  description: z.string().max(500).optional(),
  playlists: z
    .array(z.object({ id: z.number() }))
    .min(1, "At least one island is required"),
});

export type VoyageFormData = z.infer<typeof voyageSchema>;
