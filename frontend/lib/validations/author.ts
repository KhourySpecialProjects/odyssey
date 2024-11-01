import { z } from "zod";

export const BIO_MAX_LENGTH = 400;
export const BioFormSchema = z.object({
  bio: z
    .string()
    .min(10, {
      message: "Bio must be at least 10 characters.",
    })
    .max(BIO_MAX_LENGTH, {
      message: `Bio must not be longer than ${BIO_MAX_LENGTH} characters.`,
    }),
});
