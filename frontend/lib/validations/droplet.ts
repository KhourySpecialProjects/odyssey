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
  focusArea: z.enum(focusAreas),
  type: z.enum(types),
  tagIds: z.number().array(),
  learningObjectives: z.string().min(2).max(200).array(),
});
