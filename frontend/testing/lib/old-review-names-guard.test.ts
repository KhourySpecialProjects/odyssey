import fs from "fs";
import path from "path";

// ODY-901: the review panel, checks page and quoted passages were renamed in the UI.
// Fails if an old name comes back under the UI folders or the review lib folders.

const ROOT = path.resolve(__dirname, "../..");
const DIRS = [
  "components/draft",
  "app/(editing)",
  "lib/review-panel",
  "lib/overview-scan",
];
const OLD_NAMES =
  /reviewer\s+transcript|final\s+overview\s+scan|transgression/i;

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

describe("old review names", () => {
  it.each(DIRS)("do not appear under %s", (dir) => {
    const files = sourceFiles(path.join(ROOT, dir));
    expect(files.length).toBeGreaterThan(0);
    const offenders = files.filter((file) =>
      OLD_NAMES.test(fs.readFileSync(file, "utf8")),
    );
    expect(offenders.map((f) => path.relative(ROOT, f))).toEqual([]);
  });
});
