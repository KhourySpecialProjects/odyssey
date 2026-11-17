import fs from "fs";
import path from "path";

// ODY-901: the review panel, scan page and quoted passages were renamed in the UI.
// Fails if an old name comes back under components/draft or app/(editing).

const ROOT = path.resolve(__dirname, "../..");
const DIRS = ["components/draft", "app/(editing)"];
const OLD_NAMES = /reviewer transcript|final overview scan|transgression/i;

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

describe("old review names", () => {
  it.each(DIRS)("do not appear under %s", (dir) => {
    const offenders = sourceFiles(path.join(ROOT, dir)).filter((file) =>
      OLD_NAMES.test(fs.readFileSync(file, "utf8")),
    );
    expect(offenders.map((f) => path.relative(ROOT, f))).toEqual([]);
  });
});
