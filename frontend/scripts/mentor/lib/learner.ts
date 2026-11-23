import crypto from "node:crypto";
import { learnerBlock } from "@/lib/mentor/learner";
import type { EvalCase } from "./files";

// The block is ODY-934's; the eval sends the real one.
export {
  learnerBlock,
  LEARNER_MAX_CHARS,
  type LearnerContext,
} from "@/lib/mentor/learner";

/** What every case's learner block says, for --resume to notice a change; null with none */
export function learnersSha(cases: EvalCase[]): string | null {
  const blocks = cases.flatMap((c) =>
    c.profile ? [[c.id, learnerBlock(c.profile)]] : [],
  );
  return blocks.length
    ? crypto.createHash("sha256").update(JSON.stringify(blocks)).digest("hex")
    : null;
}
