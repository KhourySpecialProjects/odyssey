import { z } from "zod";

/** Maximum dataset file size in bytes (25 MB). Shared across client and server validation. */
export const MAX_DATASET_FILE_SIZE = 25 * 1024 * 1024;

export const datasetSchema = z.object({
  name: z.string().min(1).max(255),
  url: z.string().url(),
  fileType: z.string().min(1),
  fileSize: z.number().max(MAX_DATASET_FILE_SIZE),
});

export type DatasetInput = z.infer<typeof datasetSchema>;
