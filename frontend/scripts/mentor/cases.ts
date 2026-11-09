/*
Checks Mentor's eval cases (ODY-885) against the fixtures, and writes the
documents for drafting and reviewing them. Free: sends nothing, and needs no
.env.local.

To run, from frontend/:
  npx tsx scripts/mentor/cases.ts --check   # the checks only; exits 1 on any problem
  npx tsx scripts/mentor/cases.ts           # the checks, then cases.md for review
  npx tsx scripts/mentor/cases.ts --dump    # runs/lessons.md, every lesson for drafting
*/
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import {
  casesMarkdown,
  countProblems,
  lessonsMarkdown,
  validateCases,
} from "./lib/cases";
import {
  CASES_FILE,
  FIXTURES_DIR,
  loadCases,
  loadFixtures,
  MENTOR_DIR,
  RUNS_DIR,
} from "./lib/files";

const write = (file: string, text: string) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${text}\n`);
  console.log(`Wrote ${path.relative(process.cwd(), file)}`);
};

function main() {
  const { values } = parseArgs({
    options: {
      check: { type: "boolean", default: false },
      dump: { type: "boolean", default: false },
    },
  });
  const fixtures = loadFixtures();
  if (!fixtures.size) {
    throw new Error(
      `No fixtures in ${path.relative(process.cwd(), FIXTURES_DIR)}: snapshot some first (see scripts/mentor/README.md)`,
    );
  }
  if (values.dump) {
    write(path.join(RUNS_DIR, "lessons.md"), lessonsMarkdown(fixtures));
    return;
  }

  const cases = loadCases(fixtures);
  const problems = [...validateCases(cases, fixtures), ...countProblems(cases)];
  if (problems.length) {
    console.error(`${problems.length} problems:\n- ${problems.join("\n- ")}`);
    process.exit(1);
  }
  console.log(
    `${path.basename(CASES_FILE)}: ${cases.length} cases, no problems`,
  );
  if (!values.check) {
    write(path.join(MENTOR_DIR, "cases.md"), casesMarkdown(cases, fixtures));
  }
}

try {
  main();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
