import { z } from "zod";

/** Maximum dataset file size in bytes (25 MB). Shared across client and server validation. */
export const MAX_DATASET_FILE_SIZE = 25 * 1024 * 1024;

export const datasetSchema = z.object({
  name: z.string().min(1).max(255),
  fileUrl: z
    .string()
    .min(1)
    .refine(
      (value) => value.startsWith("/uploads/") || /^https?:\/\/.+/i.test(value),
      {
        message: 'fileUrl must be an http(s) URL or a "/uploads/" path.',
      },
    ),
  format: z.enum(["csv", "json", "xlsx"]),
  fileSize: z.number().max(MAX_DATASET_FILE_SIZE),
  droplet: z.number().int().positive(),
});

export type DatasetInput = z.infer<typeof datasetSchema>;
