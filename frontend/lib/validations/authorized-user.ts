import { z } from "zod";

export const AuthorizedUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  isEnabled: z.coerce.boolean(),
  isAdmin: z.coerce.boolean(),
});
