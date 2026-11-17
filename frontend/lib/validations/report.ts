import { z } from "zod";

export const reportSchema = z.object({
  type: z.enum(["bug"]).default("bug"),
  fullName: z
    .string()
    .min(2, { error: "Enter at least 2 characters" })
    .max(100, { error: "Use 100 characters or fewer" }),
  email: z.string().email({ error: "Enter a valid email address" }),
  path: z.string(),
  description: z
    .string()
    .min(10, { error: "Enter at least 10 characters" })
    .max(1000, { error: "Use 1000 characters or fewer" }),
  sessionUrl: z.string().optional(),
});
