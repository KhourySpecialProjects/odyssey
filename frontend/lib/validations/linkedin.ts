import { z } from "zod";

export const LinkedinSchema = z.object({
  linkedin: z.string().url(),
});
