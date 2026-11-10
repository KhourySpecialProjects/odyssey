import fs from "fs";
import path from "path";
import * as ts from "typescript";

// Every request to Strapi must send `Strapi-Response-Format: v4` (ODY-607), so
// Strapi v5 keeps answering in the v4 shape that flattenAttributes expects.
// fetchAPI() is covered by its own unit test; this guards the raw fetch() calls.

const SOURCE_DIRS = [
  "lib",
  "app",
  "components",
  "hooks",
  "providers",
  "contexts",
  "stores",
];
const EXCLUDED_DIRS = new Set([
  "node_modules",
  ".next",
  "testing",
  "tests",
  "__tests__",
  "e2e",
]);
const HEADER_CONST = "STRAPI_RESPONSE_FORMAT_HEADER";

/** A fetch() goes to Strapi if its URL uses a Strapi base URL or it sends the Strapi token. */
const STRAPI_URL =
  /STRAPI_API_URL|STRAPI_BASE_URL|NEXT_PUBLIC_STRAPI_API_URL|getStrapiURL/;
const STRAPI_TOKEN = /STRAPI_ACCESS_TOKEN/;

export type StrapiFetch = { line: number; hasHeader: boolean };

/** Finds every fetch() to Strapi in `source` and whether it sends the response-format header. */
export function scanSource(
  source: string,
  fileName = "file.ts",
): StrapiFetch[] {
  const sf = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    fileName.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  // Local helpers like `function strapiHeaders()` count if their body spreads the header.
  const headerHelpers = new Set<string>();
  const findHelpers = (n: ts.Node) => {
    if (
      ts.isFunctionDeclaration(n) &&
      n.name &&
      n.body?.getText(sf).includes(HEADER_CONST)
    ) {
      headerHelpers.add(n.name.text);
    }
    n.forEachChild(findHelpers);
  };
  findHelpers(sf);

  const results: StrapiFetch[] = [];
  const visit = (n: ts.Node) => {
    if (
      ts.isCallExpression(n) &&
      ts.isIdentifier(n.expression) &&
      n.expression.text === "fetch"
    ) {
      const url = n.arguments[0]?.getText(sf) ?? "";
      const init = n.arguments[1]?.getText(sf) ?? "";
      if (STRAPI_URL.test(url) || STRAPI_TOKEN.test(init)) {
        const usesHelper = [...headerHelpers].some((h) =>
          init.includes(`${h}(`),
        );
        results.push({
          line: sf.getLineAndCharacterOfPosition(n.getStart()).line + 1,
          hasHeader: init.includes(HEADER_CONST) || usesHelper,
        });
      }
    }
    n.forEachChild(visit);
  };
  visit(sf);
  return results;
}

function findSourceFiles(root: string): string[] {
  const results: string[] = [];
  for (const top of SOURCE_DIRS) {
    const base = path.join(root, top);
    if (!fs.existsSync(base)) continue;
    for (const entry of fs.readdirSync(base, { recursive: true }) as string[]) {
      const rel = path.join(top, entry);
      if (rel.split(path.sep).some((seg) => EXCLUDED_DIRS.has(seg))) continue;
      if (!/\.(ts|tsx)$/.test(entry) || /\.(test|spec)\.tsx?$/.test(entry))
        continue;
      results.push(rel);
    }
  }
  return results.sort();
}

describe("scanSource", () => {
  it("flags a Strapi fetch without the header", () => {
    const src = `fetch(\`\${STRAPI_API_URL}/api/droplets\`, { headers: { Authorization: "x" } });`;
    expect(scanSource(src)).toEqual([{ line: 1, hasHeader: false }]);
  });

  it("accepts a Strapi fetch that spreads the header", () => {
    const src = `fetch(\`\${STRAPI_API_URL}/api/droplets\`, { headers: { ...${HEADER_CONST} } });`;
    expect(scanSource(src)).toEqual([{ line: 1, hasHeader: true }]);
  });

  it("treats a call that sends the Strapi token as a Strapi call even with a variable URL", () => {
    const src = `fetch(url, { headers: { Authorization: \`Bearer \${STRAPI_ACCESS_TOKEN}\` } });`;
    expect(scanSource(src)).toEqual([{ line: 1, hasHeader: false }]);
  });

  it("accepts a local header helper that spreads the header", () => {
    const src = [
      `function strapiHeaders() { return { ...${HEADER_CONST} }; }`,
      `fetch(\`\${STRAPI_API_URL}/api/x\`, { headers: strapiHeaders() });`,
    ].join("\n");
    expect(scanSource(src)).toEqual([{ line: 2, hasHeader: true }]);
  });

  it("rejects a local header helper that doesn't spread the header", () => {
    const src = [
      `function strapiHeaders() { return { Authorization: "x" }; }`,
      `fetch(\`\${STRAPI_API_URL}/api/x\`, { headers: strapiHeaders() });`,
    ].join("\n");
    expect(scanSource(src)).toEqual([{ line: 2, hasHeader: false }]);
  });

  it("ignores fetch calls that don't go to Strapi", () => {
    const src = `fetch("https://api.linear.app/graphql", { headers: { Authorization: key } });`;
    expect(scanSource(src)).toEqual([]);
  });
});

describe("Strapi-Response-Format header on every raw fetch() to Strapi", () => {
  const root = path.resolve(__dirname, "../..");
  const found = findSourceFiles(root).flatMap((rel) =>
    scanSource(fs.readFileSync(path.join(root, rel), "utf-8"), rel).map(
      (r) => ({ ...r, file: rel }),
    ),
  );

  it("finds the Strapi fetch calls (guards against the scanner silently matching nothing)", () => {
    expect(found.length).toBeGreaterThan(100);
  });

  it("sends the header on all of them", () => {
    const missing = found
      .filter((f) => !f.hasHeader)
      .map((f) => `${f.file}:${f.line}`);
    expect(missing).toEqual([]);
  });
});
