import { z } from "zod";

const BlockSchema = z.object({
  id: z.number().int().optional(),
  __component: z.string(),
  content: z.string(),
  title: z.string().optional(),
  type: z.string().optional(),
  label: z.string().optional(),
  url: z.string().optional(),
});

export const LessonSchema = z.object({
  name: z.string().min(2).max(100),
  dropletId: z.number().int(),
  blocks: BlockSchema.array(),
});
