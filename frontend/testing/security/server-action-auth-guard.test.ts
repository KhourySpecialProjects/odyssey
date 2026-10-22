import fs from "fs";
import path from "path";
import type * as TS from "typescript";
import { hasUseServerDirective } from "@/testing/helpers/use-server-directive";
import { PUBLIC_ACTIONS, PENDING_AUTH } from "./server-action-auth-allowlist";

const EXCLUDED_DIRS = new Set([
  "node_modules",
  ".next",
  "testing",
  "tests",
  "__tests__",
  "e2e",
]);

/** Finds every `.ts`/`.tsx` file under lib/ and app/ starting with "use server". */
export function findUseServerFiles(root: string): string[] {
  const results: string[] = [];

  for (const top of ["lib", "app"]) {
    const base = path.join(root, top);
    if (!fs.existsSync(base)) continue;

    const entries = fs.readdirSync(base, { recursive: true }) as string[];
    for (const entry of entries) {
      const rel = path.join(top, entry);
      if (rel.split(path.sep).some((seg) => EXCLUDED_DIRS.has(seg))) continue;
      if (!/\.(ts|tsx)$/.test(entry)) continue;

      const full = path.join(root, rel);
      let isFile: boolean;
      try {
        isFile = fs.statSync(full).isFile();
      } catch {
        continue;
      }
      if (!isFile) continue;

      if (hasUseServerDirective(fs.readFileSync(full, "utf-8"))) {
        results.push(rel);
      }
    }
  }

  return results.sort();
}

export type ScanEntry = { name: string; guarded: boolean };
export type ScanFileResult =
  | { ok: true; entries: ScanEntry[] }
  | { ok: false; error: string };

/** True if any call in `node`'s subtree is to the identifier `requireRole`/`withAuth`. */
function containsGuardCall(node: TS.Node, ts: typeof TS): boolean {
  let found = false;
  const visit = (n: TS.Node) => {
    if (found) return;
    if (
      ts.isCallExpression(n) &&
      ts.isIdentifier(n.expression) &&
      (n.expression.text === "requireRole" || n.expression.text === "withAuth")
    ) {
      found = true;
      return;
    }
    ts.forEachChild(n, visit);
  };
  visit(node);
  return found;
}

/** True if `node` (a top-level statement) has the `export` modifier. */
function isExported(node: TS.Node, ts: typeof TS): boolean {
  const modifiers = (node as { modifiers?: readonly TS.ModifierLike[] })
    .modifiers;
  return !!modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
}

/** True if every named-export element is type-only (`export { type T }`). */
function isAllTypeOnlyNamedExports(
  clause: TS.NamedExportBindings,
  ts: typeof TS,
): boolean {
  return (
    ts.isNamedExports(clause) && clause.elements.every((el) => el.isTypeOnly)
  );
}

function unsupportedForm(filePath: string, stmt: TS.Statement): ScanFileResult {
  return {
    ok: false,
    error: `${filePath}: unsupported export form "${stmt
      .getText()
      .split("\n")[0]
      .slice(0, 80)}"`,
  };
}

/**
 * Scans one file's top-level exports. Exported FunctionDeclarations are
 * reported guarded/unguarded; type/interface exports (including type-only
 * `export {}`/`export type {}`) are ignored; any other exported value form
 * (`export const`, `export {}`, `export default`, re-exports) is unsupported.
 */
export function scanFile(filePath: string, source: string): ScanFileResult {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ts = require("typescript") as typeof TS;
  const sf = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
  );
  const entries: ScanEntry[] = [];

  for (const stmt of sf.statements) {
    if (ts.isFunctionDeclaration(stmt)) {
      if (!isExported(stmt, ts)) continue;
      entries.push({
        name: stmt.name?.text ?? "default",
        guarded: containsGuardCall(stmt, ts),
      });
      continue;
    }

    if (ts.isTypeAliasDeclaration(stmt) || ts.isInterfaceDeclaration(stmt)) {
      continue;
    }

    if (ts.isExportDeclaration(stmt)) {
      if (stmt.isTypeOnly) continue;
      if (
        stmt.exportClause &&
        isAllTypeOnlyNamedExports(stmt.exportClause, ts)
      ) {
        continue;
      }
      return unsupportedForm(filePath, stmt);
    }

    if (ts.isExportAssignment(stmt)) {
      return unsupportedForm(filePath, stmt);
    }

    if (isExported(stmt, ts)) {
      return unsupportedForm(filePath, stmt);
    }
  }

  return { ok: true, entries };
}

/** One scanned export, flattened to its allowlist key. */
export type ScanResultEntry = { key: string; guarded: boolean };

/** Applies the four allowlist rules; returns paste-ready failure messages. */
export function checkAllowlist(
  scanResults: ScanResultEntry[],
  publicActions: Record<string, string>,
  pendingAuth: Record<string, string>,
): string[] {
  const failures: string[] = [];
  const seen = new Set(scanResults.map((r) => r.key));

  for (const { key, guarded } of scanResults) {
    const inPublic = key in publicActions;
    const inPending = key in pendingAuth;

    if (inPublic && inPending) {
      failures.push(`"${key}" is in both PUBLIC_ACTIONS and PENDING_AUTH.`);
    }
    if (!guarded && !inPublic && !inPending) {
      failures.push(`"${key}": "ODY-50X",`);
    }
    if (guarded && inPending) {
      failures.push(`"${key}" is guarded — remove it from PENDING_AUTH.`);
    }
    if (guarded && inPublic) {
      failures.push(`"${key}" is guarded — remove it from PUBLIC_ACTIONS.`);
    }
  }

  for (const key of Object.keys(publicActions)) {
    if (!seen.has(key)) {
      failures.push(
        `"${key}" no longer exists — remove it from PUBLIC_ACTIONS.`,
      );
    }
  }
  for (const [key, reason] of Object.entries(publicActions)) {
    if (!reason.trim()) {
      failures.push(`PUBLIC_ACTIONS["${key}"] needs a non-empty reason.`);
    }
  }

  for (const key of Object.keys(pendingAuth)) {
    if (!seen.has(key)) {
      failures.push(`PENDING_AUTH["${key}"] is stale — no such export.`);
    }
  }

  return failures;
}

describe("scanFile", () => {
  it("marks an export guarded by requireRole", () => {
    const result = scanFile(
      "f.ts",
      `export async function foo() {
        const gate = await requireRole([]);
      }`,
    );

    expect(result).toEqual({
      ok: true,
      entries: [{ name: "foo", guarded: true }],
    });
  });

  it("marks an export with no guard call as unguarded", () => {
    const result = scanFile(
      "f.ts",
      `export async function foo() {
        return 1;
      }`,
    );

    expect(result).toEqual({
      ok: true,
      entries: [{ name: "foo", guarded: false }],
    });
  });

  it("marks an export guarded by withAuth", () => {
    const result = scanFile(
      "f.ts",
      `export async function foo() {
        return withAuth([], async (user) => user);
      }`,
    );

    expect(result).toEqual({
      ok: true,
      entries: [{ name: "foo", guarded: true }],
    });
  });

  it("fails as an unsupported form for export const", () => {
    const result = scanFile("f.ts", `export const foo = async () => {};`);

    expect(result.ok).toBe(false);
  });

  it("ignores a type export", () => {
    const result = scanFile(
      "f.ts",
      `export type Foo = { id: number };
      export async function bar() {
        await requireRole([]);
      }`,
    );

    expect(result).toEqual({
      ok: true,
      entries: [{ name: "bar", guarded: true }],
    });
  });

  it("counts a guard call inside a never-called nested closure as guarded", () => {
    // Known heuristic weakness: this doesn't prove the guard actually runs.
    const result = scanFile(
      "f.ts",
      `export async function foo() {
        const helper = () => {
          requireRole([]);
        };
        return 1;
      }`,
    );

    expect(result).toEqual({
      ok: true,
      entries: [{ name: "foo", guarded: true }],
    });
  });

  it("fails as unsupported for a named re-export of a local function", () => {
    const result = scanFile(
      "f.ts",
      `async function foo() {}
      export { foo };`,
    );

    expect(result.ok).toBe(false);
  });

  it("fails as unsupported for export *", () => {
    const result = scanFile("f.ts", `export * from "./x";`);

    expect(result.ok).toBe(false);
  });

  it("fails as unsupported for export default of an identifier", () => {
    const result = scanFile(
      "f.ts",
      `async function foo() {}
      export default foo;`,
    );

    expect(result.ok).toBe(false);
  });

  it("fails as unsupported for export default of an arrow function", () => {
    const result = scanFile("f.ts", `export default async () => {};`);

    expect(result.ok).toBe(false);
  });

  it("ignores a type-only re-export", () => {
    const result = scanFile("f.ts", `export type { T } from "./x";`);

    expect(result).toEqual({ ok: true, entries: [] });
  });
});

describe("checkAllowlist", () => {
  it("fails a PUBLIC_ACTIONS key whose function no longer exists", () => {
    const failures = checkAllowlist([], { "a#b": "reason" }, {});

    expect(failures).toEqual([
      '"a#b" no longer exists — remove it from PUBLIC_ACTIONS.',
    ]);
  });

  it("fails a PUBLIC_ACTIONS key that is now guarded", () => {
    const failures = checkAllowlist(
      [{ key: "a#b", guarded: true }],
      { "a#b": "reason" },
      {},
    );

    expect(failures).toEqual([
      '"a#b" is guarded — remove it from PUBLIC_ACTIONS.',
    ]);
  });

  it("fails a PENDING_AUTH key whose function no longer exists", () => {
    const failures = checkAllowlist([], {}, { "a#b": "ODY-1" });

    expect(failures).toEqual([
      'PENDING_AUTH["a#b"] is stale — no such export.',
    ]);
  });

  it("fails a PENDING_AUTH key that is now guarded", () => {
    const failures = checkAllowlist(
      [{ key: "a#b", guarded: true }],
      {},
      { "a#b": "ODY-1" },
    );

    expect(failures).toEqual([
      '"a#b" is guarded — remove it from PENDING_AUTH.',
    ]);
  });

  it("fails an unguarded export that is not allowlisted", () => {
    const failures = checkAllowlist([{ key: "a#b", guarded: false }], {}, {});

    expect(failures).toEqual(['"a#b": "ODY-50X",']);
  });

  it("fails a key listed in both allowlists", () => {
    const failures = checkAllowlist(
      [{ key: "a#b", guarded: false }],
      { "a#b": "reason" },
      { "a#b": "ODY-1" },
    );

    expect(failures).toEqual([
      '"a#b" is in both PUBLIC_ACTIONS and PENDING_AUTH.',
    ]);
  });

  it("fails a PUBLIC_ACTIONS entry with an empty reason", () => {
    const failures = checkAllowlist(
      [{ key: "a#b", guarded: false }],
      { "a#b": "" },
      {},
    );

    expect(failures).toEqual([
      'PUBLIC_ACTIONS["a#b"] needs a non-empty reason.',
    ]);
  });
});

describe("server action auth guard", () => {
  const root = path.resolve(__dirname, "../..");
  const files = findUseServerFiles(root);

  it("finds use-server files under lib/ and app/", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it("every export is guarded, allowlisted, or the allowlist is stale", () => {
    const failures: string[] = [];
    const scanResults: ScanResultEntry[] = [];

    for (const rel of files) {
      const full = path.join(root, rel);
      const result = scanFile(rel, fs.readFileSync(full, "utf-8"));

      if (!result.ok) {
        failures.push(result.error);
        continue;
      }

      for (const entry of result.entries) {
        scanResults.push({
          key: `${rel}#${entry.name}`,
          guarded: entry.guarded,
        });
      }
    }

    failures.push(...checkAllowlist(scanResults, PUBLIC_ACTIONS, PENDING_AUTH));

    expect(failures).toEqual([]);
  });
});
