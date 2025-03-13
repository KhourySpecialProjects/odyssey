import { z } from "zod";

export const GithubSchema = z.object({
  github: z.string().url(),
});
