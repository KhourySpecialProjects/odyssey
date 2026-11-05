import fs from "fs";
import path from "path";

// Mentor builds its prompt on the server from ids the browser sends
// (ODY-882, ODY-886). Client components may use Mentor's types and ref
// parser, but not the modules that read lessons. Only direct imports are
// checked: a re-export through another module isn't followed.

const SOURCE_DIRS = [
  "app",
  "components",
  "hooks",
  "lib",
  "providers",
  "contexts",
];
const EXCLUDED_DIRS = new Set([
  "node_modules",
  ".next",
  "testing",
  "tests",
  "__tests__",
  "e2e",
]);
const CLIENT = /^(?:\s|\/\/[^\n]*\n|\/\*[\s\S]*?\*\/)*["']use client["']/;
const LESSON_MODULE =
  /["']@\/lib\/mentor\/(context|quiz|ask|answer-key|prompt)["']/;

/** Whether source imports a module that reads lessons; type-only imports are fine */
const importsLessonModule = (source: string) =>
  LESSON_MODULE.test(source.replace(/import\s+type\b[^;]*;/g, ""));

function clientFiles(root: string): string[] {
  return SOURCE_DIRS.flatMap((top) => {
    const base = path.join(root, top);
    if (!fs.existsSync(base)) return [];
    return (fs.readdirSync(base, { recursive: true }) as string[])
      .map((entry) => path.join(top, entry))
      .filter(
        (rel) =>
          /\.(ts|tsx)$/.test(rel) &&
          !/\.(test|spec)\.tsx?$/.test(rel) &&
          !rel.split(path.sep).some((seg) => EXCLUDED_DIRS.has(seg)) &&
          CLIENT.test(fs.readFileSync(path.join(root, rel), "utf8")),
      );
  });
}

describe("Mentor's lesson modules stay out of client components", () => {
  it.each([
    ['import { buildLessonContext } from "@/lib/mentor/context";', true],
    ['import {\n  findQuizQuestion,\n} from "@/lib/mentor/quiz";', true],
    ['const m = await import("@/lib/mentor/context");', true],
    ['import { buildMentorRequest } from "@/lib/mentor/prompt";', true],
    ['import type { LessonContext } from "@/lib/mentor/context";', false],
    ['import { citedRefs } from "@/lib/mentor/refs";', false],
  ])("checks %j", (source, flagged) => {
    expect(importsLessonModule(source)).toBe(flagged);
  });

  it("finds no client component that imports one", () => {
    const root = path.join(__dirname, "..", "..", "..");
    const files = clientFiles(root);
    // Guards against the scan silently matching nothing
    expect(files.length).toBeGreaterThan(50);
    expect(
      files.filter((file) =>
        importsLessonModule(fs.readFileSync(path.join(root, file), "utf8")),
      ),
    ).toEqual([]);
  });
});
