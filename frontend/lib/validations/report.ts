import { z } from "zod";

export const reportSchema = z.object({
  type: z.enum(["bug"]).default("bug"),
  fullName: z.string().min(2).max(100),
  email: z.string().email(),
  path: z.string(),
  description: z.string().min(10).max(1000),
});
