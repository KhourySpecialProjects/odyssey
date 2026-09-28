/**
 * Detects a leading `"use server"` directive using the TypeScript parser, so
 * it isn't fooled by quote style or a leading comment before the directive.
 * Falls back to a regex if `typescript` can't be required under whatever
 * transform is running the test (e.g. a future SWC-based config).
 */
export function hasUseServerDirective(source: string): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ts = require("typescript") as typeof import("typescript");
    const sf = ts.createSourceFile(
      "scan.ts",
      source,
      ts.ScriptTarget.Latest,
      true,
    );
    const first = sf.statements[0];
    return (
      first !== undefined &&
      ts.isExpressionStatement(first) &&
      ts.isStringLiteral(first.expression) &&
      first.expression.text === "use server"
    );
  } catch {
    // `typescript` couldn't be imported under this transform — fall back to
    // a regex that tolerates leading comments and either quote style.
    return /^\s*(?:(?:\/\/[^\n]*\n|\/\*[\s\S]*?\*\/)\s*)*['"]use server['"]/.test(
      source,
    );
  }
}
