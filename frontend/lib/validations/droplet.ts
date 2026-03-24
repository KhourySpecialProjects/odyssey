import { z } from "zod";
import { DROPLET_FILTERS } from "../globals";
const findFilterOptions = (name: string) =>
  DROPLET_FILTERS.find((f) => f.name === name)!.options.map((o) => o.value) as [
    string,
    ...string[],
  ];

const focusAreas = findFilterOptions("focusArea");
const types = findFilterOptions("type");
const difficulties = findFilterOptions("difficulty");

export const DropletSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string(),
  authorized_users: z.number().array(),
  focusArea: z.enum(focusAreas),
  type: z.enum(types),
  difficulty: z.enum(difficulties).optional(),
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
  inReview: z.boolean(),
  status: z.string(),
  afterReview: z.string(),
});
