import crypto from "node:crypto";
import type { EvalCase } from "./files";

// ODY-934's learner block, stubbed to the contract agreed on ODY-941. ODY-934
// isn't on develop yet. When it is, replace everything below except
// learnersSha with
//   export { learnerBlock, LEARNER_MAX_CHARS, type LearnerContext } from "@/lib/mentor/learner";
// and the eval sends 934's real block.

export type LearnerContext = {
  /** Newest first, at most 15. `month` is "YYYY-MM" */
  finished: {
    name: string;
    tags: string[];
    difficulty: string | null;
    month: string;
  }[];
  /** At most 5 */
  inProgress: { name: string; viewed: number; total: number }[];
  /** The current droplet's prerequisites */
  prerequisites: { name: string; finished: boolean }[];
  /** Titles of this droplet's lessons the student has viewed */
  viewedLessons: string[];
};

/** About 600 tokens at 4 characters a token; the oldest finished droplets go first */
export const LEARNER_MAX_CHARS = 2400;

const section = (title: string, lines: string[]) => [
  title,
  ...(lines.length ? lines : ["none"]).map((line) => `- ${line}`),
];

function render(learner: LearnerContext): string {
  const finished = learner.finished.map(({ name, tags, difficulty, month }) => {
    const details = [difficulty, tags.join(", ")].filter(Boolean).join("; ");
    return `${name}${details ? ` (${details})` : ""}, finished ${month}`;
  });
  const inProgress = learner.inProgress.map(
    ({ name, viewed, total }) =>
      `${name}: ${viewed} of ${total} ${total === 1 ? "lesson" : "lessons"} viewed`,
  );
  const prerequisites = learner.prerequisites.map(
    ({ name, finished: done }) =>
      `${name}: ${done ? "finished" : "not finished"}`,
  );
  return [
    ...section("Finished droplets, newest first:", finished),
    ...section("In progress:", inProgress),
    ...section("This droplet's prerequisites:", prerequisites),
    ...section(
      "Lessons of this droplet already viewed:",
      learner.viewedLessons,
    ),
  ].join("\n");
}

/** The block's text, without its <learner> tags, within LEARNER_MAX_CHARS where dropping old droplets can do it */
export function learnerBlock(learner: LearnerContext): string {
  let { finished } = learner;
  let text = render(learner);
  while (text.length > LEARNER_MAX_CHARS && finished.length) {
    finished = finished.slice(0, -1);
    text = render({ ...learner, finished });
  }
  return text;
}

/** What every case's learner block says, for --resume to notice a change; null with none */
export function learnersSha(cases: EvalCase[]): string | null {
  const blocks = cases.flatMap((c) =>
    c.profile ? [[c.id, learnerBlock(c.profile)]] : [],
  );
  return blocks.length
    ? crypto.createHash("sha256").update(JSON.stringify(blocks)).digest("hex")
    : null;
}
