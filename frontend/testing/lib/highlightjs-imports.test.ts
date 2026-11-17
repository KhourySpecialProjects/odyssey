import fs from "fs";
import path from "path";

// highlight.js's root entry is the full 192-language build and shares its core
// instance with highlight.js/lib/core, so one runtime import of it puts every
// grammar in the bundle and defeats the lazy loading in
// components/droplets/lessons/highlighter.ts. Use that module (via
// load-highlighter) instead. Type-only imports are erased at build time.
const ROOT = path.resolve(__dirname, "../..");
const SCAN_DIRS = ["app", "components", "lib", "hooks"];
const EXCLUDED_DIRS = new Set(["node_modules", ".next"]);

function findSourceFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return EXCLUDED_DIRS.has(entry.name) ? [] : findSourceFiles(full);
    }
    return /\.(ts|tsx|js|jsx|mjs)$/.test(entry.name) ? [full] : [];
  });
}

const BARE = `["']highlight\\.js["']`;
// import x from "highlight.js" / import "highlight.js" / export … from
// "highlight.js" / import("highlight.js") / require("highlight.js")
const RUNTIME_IMPORT_PATTERNS = [
  new RegExp(`^\\s*import\\s+(?!type\\b)[^;]*?from\\s*${BARE}`, "m"),
  new RegExp(`^\\s*import\\s*${BARE}`, "m"),
  new RegExp(`^\\s*export\\s+(?!type\\b)[^;]*?from\\s*${BARE}`, "m"),
  new RegExp(`\\bimport\\s*\\(\\s*${BARE}`),
  new RegExp(`\\brequire\\s*\\(\\s*${BARE}`),
];

export function hasRuntimeHighlightJsImport(source: string): boolean {
  return RUNTIME_IMPORT_PATTERNS.some((re) => re.test(source));
}

describe("highlight.js imports", () => {
  it("detects runtime imports but not type-only ones", () => {
    expect(
      hasRuntimeHighlightJsImport('import hljs from "highlight.js";'),
    ).toBe(true);
    expect(
      hasRuntimeHighlightJsImport('import { HLJSApi } from "highlight.js"'),
    ).toBe(true);
    expect(hasRuntimeHighlightJsImport('import "highlight.js"')).toBe(true);
    expect(
      hasRuntimeHighlightJsImport('const h = await import("highlight.js")'),
    ).toBe(true);
    expect(hasRuntimeHighlightJsImport('require("highlight.js")')).toBe(true);
    expect(
      hasRuntimeHighlightJsImport(
        'import type { LanguageFn } from "highlight.js";',
      ),
    ).toBe(false);
    expect(
      hasRuntimeHighlightJsImport('import hljs from "highlight.js/lib/core";'),
    ).toBe(false);
  });

  it("is only imported at runtime via highlight.js/lib/core (never the full build)", () => {
    const offenders = SCAN_DIRS.flatMap((dir) =>
      findSourceFiles(path.join(ROOT, dir)),
    )
      .filter((file) =>
        hasRuntimeHighlightJsImport(fs.readFileSync(file, "utf-8")),
      )
      .map((file) => path.relative(ROOT, file));

    expect(offenders).toEqual([]);
  });
});
