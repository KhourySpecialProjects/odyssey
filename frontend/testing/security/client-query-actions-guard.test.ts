import fs from "fs";
import path from "path";
import type * as TS from "typescript";
import { hasUseServerDirective } from "@/testing/helpers/use-server-directive";
import { CLIENT_QUERY_ACTIONS } from "./client-query-actions-allowlist";

/**
 * ODY-640: a Server Action's ID is only shipped to the browser when a client
 * module imports it. Read actions that accept Strapi query options
 * (populate/fields/filters/sort) and are client-imported let any caller dump
 * records with a query of their choosing. This guard fails when a client module
 * imports such an action that is not in CLIENT_QUERY_ACTIONS (which may only
 * shrink; ODY-511 owns draining it), and when an allowlist entry is stale.
 *
 * Known limits:
 * - Only direct named imports from a client module are followed. A client
 *   module that reaches an action through a non-client helper module, a
 *   barrel re-export, a namespace import (`import * as x`) or a dynamic
 *   `import()` is not seen.
 * - A function counts as taking query options when a parameter is typed
 *   StrapiRequestParams/StrapiBaseRequestParams, is destructured or typed
 *   with a populate/fields/filters/sort property, or is named populate or
 *   filters. Query options smuggled in another way (e.g. a `Record<string,
 *   unknown>` spread into urlParams) are not detected.
 * - Only exported function declarations are considered, matching
 *   server-action-auth-guard.test.ts.
 * - The ground truth is the production build: list the action IDs present in
 *   .next/static/chunks against .next/server/server-reference-manifest.json
 *   (see docs/agent/server-action-auth.md).
 */

const QUERY_PROPS = new Set(["populate", "fields", "filters", "sort"]);
const QUERY_TYPES = new Set(["StrapiRequestParams", "StrapiBaseRequestParams"]);
const QUERY_PARAM_NAMES = new Set(["populate", "filters"]);

const CLIENT_DIRS = [
  "app",
  "components",
  "providers",
  "hooks",
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

/** Lists files under `dirs` (relative to root) that satisfy `keep(source)`. */
function findFiles(
  root: string,
  dirs: string[],
  keep: (source: string) => boolean,
): string[] {
  const results: string[] = [];
  for (const top of dirs) {
    const base = path.join(root, top);
    if (!fs.existsSync(base)) continue;
    const entries = fs.readdirSync(base, { recursive: true }) as string[];
    for (const entry of entries) {
      const rel = path.join(top, entry);
      if (rel.split(path.sep).some((seg) => EXCLUDED_DIRS.has(seg))) continue;
      if (!/\.(ts|tsx)$/.test(entry)) continue;
      const full = path.join(root, rel);
      try {
        if (!fs.statSync(full).isFile()) continue;
      } catch {
        continue;
      }
      if (keep(fs.readFileSync(full, "utf-8"))) results.push(rel);
    }
  }
  return results.sort();
}

function loadTs(): typeof TS {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require("typescript") as typeof TS;
}

function parse(filePath: string, source: string): TS.SourceFile {
  const ts = loadTs();
  return ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true);
}

function isExported(node: TS.Node, ts: typeof TS): boolean {
  const modifiers = (node as { modifiers?: readonly TS.ModifierLike[] })
    .modifiers;
  return !!modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
}

function typeHasQueryProps(
  type: TS.TypeNode | undefined,
  ts: typeof TS,
): boolean {
  if (!type) return false;
  if (ts.isTypeReferenceNode(type)) {
    return QUERY_TYPES.has(type.typeName.getText());
  }
  if (ts.isTypeLiteralNode(type)) {
    return type.members.some(
      (m) => !!m.name && QUERY_PROPS.has(m.name.getText()),
    );
  }
  if (ts.isIntersectionTypeNode(type) || ts.isUnionTypeNode(type)) {
    return type.types.some((t) => typeHasQueryProps(t, ts));
  }
  return false;
}

function parameterTakesQuery(param: TS.ParameterDeclaration, ts: typeof TS) {
  if (typeHasQueryProps(param.type, ts)) return true;
  if (ts.isObjectBindingPattern(param.name)) {
    return param.name.elements.some((el) =>
      QUERY_PROPS.has((el.propertyName ?? el.name).getText()),
    );
  }
  return QUERY_PARAM_NAMES.has(param.name.getText());
}

/**
 * Names of exported functions in `source` whose parameter list accepts Strapi
 * query options. Works on the parsed AST, so multi-line signatures and
 * generics with defaults are handled.
 */
export function findQueryActions(filePath: string, source: string): string[] {
  const ts = loadTs();
  const sf = parse(filePath, source);
  const names: string[] = [];
  for (const stmt of sf.statements) {
    if (!ts.isFunctionDeclaration(stmt) || !isExported(stmt, ts)) continue;
    if (stmt.parameters.some((p) => parameterTakesQuery(p, ts))) {
      names.push(stmt.name?.text ?? "default");
    }
  }
  return names;
}

/** True when the first statement is a `"use client"` directive. */
export function hasUseClientDirective(source: string): boolean {
  const ts = loadTs();
  const first = parse("scan.tsx", source).statements[0];
  return (
    first !== undefined &&
    ts.isExpressionStatement(first) &&
    ts.isStringLiteral(first.expression) &&
    first.expression.text === "use client"
  );
}

/** Finds every "use client" .ts/.tsx file under the client directories. */
export function findClientFiles(root: string): string[] {
  return findFiles(root, CLIENT_DIRS, hasUseClientDirective);
}

/** Resolves an import specifier to a root-relative `.ts`/`.tsx` path, if local. */
export function resolveImport(
  root: string,
  fromRel: string,
  specifier: string,
): string | null {
  let base: string;
  if (specifier.startsWith("@/")) {
    base = specifier.slice(2);
  } else if (specifier.startsWith(".")) {
    base = path.join(path.dirname(fromRel), specifier);
  } else {
    return null;
  }
  base = path.normalize(base);
  for (const candidate of [
    `${base}.ts`,
    `${base}.tsx`,
    path.join(base, "index.ts"),
    path.join(base, "index.tsx"),
  ]) {
    const full = path.join(root, candidate);
    if (fs.existsSync(full) && fs.statSync(full).isFile()) return candidate;
  }
  return null;
}

/** Value (non type-only) named imports of a module: [specifier, importedName]. */
export function namedImports(
  filePath: string,
  source: string,
): Array<{ specifier: string; name: string }> {
  const ts = loadTs();
  const sf = parse(filePath, source);
  const out: Array<{ specifier: string; name: string }> = [];
  for (const stmt of sf.statements) {
    if (
      !ts.isImportDeclaration(stmt) ||
      !ts.isStringLiteral(stmt.moduleSpecifier)
    )
      continue;
    const clause = stmt.importClause;
    if (!clause || clause.isTypeOnly) continue;
    if (!clause.namedBindings || !ts.isNamedImports(clause.namedBindings))
      continue;
    for (const el of clause.namedBindings.elements) {
      if (el.isTypeOnly) continue;
      out.push({
        specifier: stmt.moduleSpecifier.text,
        name: (el.propertyName ?? el.name).text,
      });
    }
  }
  return out;
}

/** Applies the allowlist rules; returns paste-ready failure messages. */
export function checkClientQueryActions(
  queryActions: Set<string>,
  clientImports: Map<string, string[]>,
  allowlist: Record<string, string>,
): string[] {
  const failures: string[] = [];

  for (const [key, importers] of [...clientImports].sort()) {
    if (!(key in allowlist)) {
      failures.push(
        `"${key}" accepts Strapi query options and is imported by client code (${importers.join(", ")}). Pass the data from the server or add a narrow action with a fixed query. Do not allowlist new code.`,
      );
    }
  }

  for (const key of Object.keys(allowlist)) {
    if (!queryActions.has(key)) {
      failures.push(
        `CLIENT_QUERY_ACTIONS["${key}"] is stale: the function no longer exists or no longer takes query options. Remove it.`,
      );
    } else if (!clientImports.has(key)) {
      failures.push(
        `CLIENT_QUERY_ACTIONS["${key}"] is stale: no client module imports it any more. Remove it.`,
      );
    }
  }

  return failures;
}

/** Scans the repo: every query-accepting action and which client files import it. */
export function scanRepo(root: string) {
  const queryActions = new Set<string>();
  const actionFiles = new Set<string>();
  for (const rel of findFiles(root, ["lib", "app"], hasUseServerDirective)) {
    const names = findQueryActions(
      rel,
      fs.readFileSync(path.join(root, rel), "utf-8"),
    );
    for (const name of names) queryActions.add(`${rel}#${name}`);
    if (names.length) actionFiles.add(rel);
  }

  const clientImports = new Map<string, string[]>();
  for (const rel of findClientFiles(root)) {
    const source = fs.readFileSync(path.join(root, rel), "utf-8");
    for (const { specifier, name } of namedImports(rel, source)) {
      const target = resolveImport(root, rel, specifier);
      if (!target || !actionFiles.has(target)) continue;
      const key = `${target}#${name}`;
      if (!queryActions.has(key)) continue;
      clientImports.set(key, [...(clientImports.get(key) ?? []), rel]);
    }
  }
  return { queryActions, clientImports };
}

describe("findQueryActions", () => {
  it("finds a StrapiRequestParams parameter", () => {
    expect(
      findQueryActions(
        "f.ts",
        `export async function a(id: string, opts: StrapiRequestParams = {}) {}`,
      ),
    ).toEqual(["a"]);
  });

  it("finds a destructured parameter on a multi-line signature with generics", () => {
    expect(
      findQueryActions(
        "f.ts",
        `export async function a<T extends Partial<X> = X>(
          id: string,
          {
            sort,
            populate = "*",
            fields = ["*"],
          }: Foo = {},
        ): Promise<T> {}`,
      ),
    ).toEqual(["a"]);
  });

  it("finds an inline type literal and a bare populate parameter", () => {
    expect(
      findQueryActions(
        "f.ts",
        `export async function a(o: { filters?: object }) {}
         export async function b(populate: object) {}`,
      ),
    ).toEqual(["a", "b"]);
  });

  it("ignores functions without query options, non-exported ones and types", () => {
    expect(
      findQueryActions(
        "f.ts",
        `export async function a(id: number, name: string) {}
         async function b(o: StrapiRequestParams) {}
         export type T = { populate: string };`,
      ),
    ).toEqual([]);
  });
});

describe("client module detection", () => {
  it("detects a use client directive only as the first statement", () => {
    expect(hasUseClientDirective(`"use client";\nimport x from "y";`)).toBe(
      true,
    );
    expect(hasUseClientDirective(`import x from "y";\n"use client";`)).toBe(
      false,
    );
    expect(hasUseClientDirective(`"use server";`)).toBe(false);
  });

  it("collects value named imports and skips type-only ones", () => {
    expect(
      namedImports(
        "f.tsx",
        `import { a, b as c, type D } from "@/lib/x";
         import type { E } from "@/lib/y";
         import { type F } from "@/lib/z";
         import def from "@/lib/w";`,
      ),
    ).toEqual([
      { specifier: "@/lib/x", name: "a" },
      { specifier: "@/lib/x", name: "b" },
    ]);
  });
});

describe("checkClientQueryActions", () => {
  const key = "lib/requests/x.ts#get";

  it("fails a client-imported query action that is not allowlisted", () => {
    const failures = checkClientQueryActions(
      new Set([key]),
      new Map([[key, ["components/a.tsx"]]]),
      {},
    );
    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain(key);
  });

  it("passes an allowlisted, client-imported query action", () => {
    expect(
      checkClientQueryActions(
        new Set([key]),
        new Map([[key, ["components/a.tsx"]]]),
        { [key]: "ODY-511" },
      ),
    ).toEqual([]);
  });

  it("fails an allowlist entry whose function is gone or takes no query", () => {
    const failures = checkClientQueryActions(new Set(), new Map(), {
      [key]: "ODY-511",
    });
    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain("no longer exists or no longer takes query");
  });

  it("fails an allowlist entry no client module imports", () => {
    const failures = checkClientQueryActions(new Set([key]), new Map(), {
      [key]: "ODY-511",
    });
    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain("no client module imports it");
  });
});

describe("client-imported query actions guard", () => {
  const root = path.resolve(__dirname, "../..");
  const { queryActions, clientImports } = scanRepo(root);

  it("finds query actions and client modules", () => {
    expect(queryActions.size).toBeGreaterThan(0);
    expect(findClientFiles(root).length).toBeGreaterThan(0);
  });

  it("no client module imports a query-accepting action outside the allowlist", () => {
    expect(
      checkClientQueryActions(
        queryActions,
        clientImports,
        CLIENT_QUERY_ACTIONS,
      ),
    ).toEqual([]);
  });
});
