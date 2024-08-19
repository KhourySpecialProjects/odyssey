import { z } from "zod";

export const LessonSchema = z.object({
  name: z.string().min(2).max(100),
  dropletId: z.number().int(),
});
