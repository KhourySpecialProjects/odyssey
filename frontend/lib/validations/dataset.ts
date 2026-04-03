import { z } from "zod";

/** Maximum dataset file size in bytes (25 MB). Shared across client and server validation. */
export const MAX_DATASET_FILE_SIZE = 25 * 1024 * 1024;

export const datasetSchema = z.object({
  name: z.string().min(1).max(255),
  format: z.enum(["csv", "json", "xlsx"]),
  fileUrl: z.string().url(),
  fileSize: z.number().max(MAX_DATASET_FILE_SIZE),
  rowCount: z.number().int().nonnegative(),
  columnCount: z.number().int().positive(),
  columnNames: z.array(z.string()),
  columnTypes: z.array(z.string()),
  droplet: z.number().int().positive(),
});

export type DatasetInput = z.infer<typeof datasetSchema>;
