import { z } from "zod";

// Which scan flag a dismissal is for (ODY-905), as the scan page sends it.
// Text is matched exactly, so nothing is trimmed.
const text = (max: number) => z.string().min(1).max(max);

export const scanFlagKeySchema = z
  .object({
    checkId: text(100),
    ruleId: text(100),
    partId: text(50),
    blockId: text(200).nullable(),
    message: text(5000),
  })
  .strict();
