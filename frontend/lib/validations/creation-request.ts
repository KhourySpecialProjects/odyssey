import { z } from "zod";

export const creationRequestSchema = z.object({
  motivation: z.string().min(1, "Motivation is required"),
  dropletIdea: z.string().min(1, "Droplet idea is required"),
  user: z.number(), // The authorized user ID
});