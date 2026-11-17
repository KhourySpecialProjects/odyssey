/** @jest-environment node */
// Pins the exact requests every v1 case builds, on all four setups (ODY-941),
// so the learner seam and the new case kinds can't change how v1 is asked.
// The hashes change only with a deliberate change to the prompt, the cases or
// the fixtures. Then regenerate them with
//   UPDATE_V1_REQUESTS=1 npx jest testing/lib/mentor/eval-v1-requests.test.ts
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { MENTOR_PROMPT_VERSION } from "@/lib/mentor/prompt";
import {
  loadCases,
  loadFixtures,
  type EvalCase,
} from "@/scripts/mentor/lib/files";
import { planGroups, SETUPS, type SetupName } from "@/scripts/mentor/lib/plan";

const MENTOR = path.join(__dirname, "../../../scripts/mentor");
const PINNED = path.join(__dirname, "v1-requests.json");
const fixtures = loadFixtures(path.join(MENTOR, "fixtures"));
const cases = loadCases(fixtures, path.join(MENTOR, "cases.jsonl"));
const setups = Object.keys(SETUPS) as SetupName[];

const hashOf = (c: EvalCase) =>
  crypto
    .createHash("sha256")
    .update(
      JSON.stringify(
        planGroups([c], fixtures, setups, 1)
          .flat()
          .map((job) => job.params),
      ),
    )
    .digest("hex");

if (process.env.UPDATE_V1_REQUESTS) {
  it("writes the pinned requests", () => {
    const hashes = Object.fromEntries(cases.map((c) => [c.id, hashOf(c)]));
    const pinned = { promptVersion: MENTOR_PROMPT_VERSION, hashes };
    fs.writeFileSync(PINNED, `${JSON.stringify(pinned, null, 2)}\n`);
  });
} else {
  const pinned: { promptVersion: string; hashes: Record<string, string> } =
    JSON.parse(fs.readFileSync(PINNED, "utf8"));

  it("was pinned for today's prompt, or regenerate it (see the header)", () => {
    expect(pinned.promptVersion).toBe(MENTOR_PROMPT_VERSION);
  });

  it.each(Object.keys(pinned.hashes))("%s builds the same requests", (id) => {
    const c = cases.find((x) => x.id === id);
    expect(c).toBeDefined();
    expect(hashOf(c!)).toBe(pinned.hashes[id]);
  });
}
