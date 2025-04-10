import { z } from "zod";
import { DROPLET_FILTERS } from "../globals";
const focusAreas: [string, ...string[]] = [
  ...DROPLET_FILTERS[0].options.map((option) => option.value),
] as [string, ...string[]];
const types: [string, ...string[]] = [
  ...DROPLET_FILTERS[1].options.map((option) => option.value),
] as [string, ...string[]];

export const DropletSchema = z.object({
  name: z.string().min(2).max(100),
  authorized_users: z.number().array(),
  focusArea: z.enum(focusAreas),
  type: z.enum(types),
  tagIds: z.number().array(),
  isHidden: z.boolean().optional(),
  learningObjectives: z.string().min(2).max(200).array(),
  prerequisiteIds: z.number().array(),
  postrequisiteIds: z.number().array(),
  nextSteps: z
    .object({
      label: z.string().min(2).max(100).optional(),
      url: z.string().url(),
    })
    .array(),
  overview: z.string(),
  description: z.string(),
  lessons: z
    .object({
      id: z.number(),
    })
    .array(),
  droplet_lessons: z
    .array(
      z.object({
        id: z.number(),
        orderIndex: z.number(),
      }),
    )
    .optional(),
});
