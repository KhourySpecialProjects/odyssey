import { z } from "zod";

export const DropletEnrollmentSchema = z.object({
  droplet: z.number().int(),
  viewedLessons: z.number().int().array(),
});
