import { z } from "zod";

export const VoyageEnrollmentSchema = z.object({
  voyage: z.number().int(),
});

export type VoyageEnrollmentData = z.infer<typeof VoyageEnrollmentSchema>;
