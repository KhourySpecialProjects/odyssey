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

/**
 * Scans one file's top-level exports. Exported FunctionDeclarations are
 * reported guarded/unguarded; type/interface exports are ignored; any other
 * exported value form (const, `export {}`, default) is an unsupported form.
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

    if (isExported(stmt, ts)) {
      return {
        ok: false,
        error: `${filePath}: unsupported export form "${stmt
          .getText()
          .split("\n")[0]
          .slice(0, 80)}"`,
      };
    }
  }

  return { ok: true, entries };
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
});

describe("server action auth guard", () => {
  const root = path.resolve(__dirname, "../..");
  const files = findUseServerFiles(root);

  it("finds use-server files under lib/ and app/", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it("every export is guarded, allowlisted, or the allowlist is stale", () => {
    const failures: string[] = [];
    const seen = new Set<string>();

    for (const rel of files) {
      const full = path.join(root, rel);
      const result = scanFile(rel, fs.readFileSync(full, "utf-8"));

      if (!result.ok) {
        failures.push(result.error);
        continue;
      }

      for (const entry of result.entries) {
        const key = `${rel}#${entry.name}`;
        seen.add(key);

        const inPublic = key in PUBLIC_ACTIONS;
        const inPending = key in PENDING_AUTH;

        if (inPublic && inPending) {
          failures.push(`"${key}" is in both PUBLIC_ACTIONS and PENDING_AUTH.`);
        }
        if (!entry.guarded && !inPublic && !inPending) {
          failures.push(`"${key}": "ODY-50X",`);
        }
        if (entry.guarded && inPending) {
          failures.push(`"${key}" is guarded — remove it from PENDING_AUTH.`);
        }
      }
    }

    for (const [key, reason] of Object.entries(PUBLIC_ACTIONS)) {
      if (!reason.trim()) {
        failures.push(`PUBLIC_ACTIONS["${key}"] needs a non-empty reason.`);
      }
    }

    for (const key of Object.keys(PENDING_AUTH)) {
      if (!seen.has(key)) {
        failures.push(`PENDING_AUTH["${key}"] is stale — no such export.`);
      }
    }

    expect(failures).toEqual([]);
  });
});
