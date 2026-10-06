import { readdirSync, readFileSync, statSync } from "fs";
import path from "path";

/**
 * The demo's frontend/.env.demo (written by demo/setup-env.mjs) must list
 * every env var the app reads, even blank ones: Next.js still loads the
 * developer's .env.local, and a key missing from .env.demo would let a real
 * secret from there leak into the demo.
 */
const frontendDir = path.join(__dirname, "../..");
const setupScript = readFileSync(
  path.join(frontendDir, "../demo/setup-env.mjs"),
  "utf8",
);

// Set by Next itself or by next.config.mjs, never by an env file
const NOT_FROM_ENV_FILES = new Set([
  "NODE_ENV",
  "NEXT_PUBLIC_APP_VERSION",
  "NEXT_RUNTIME",
]);

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx|js|jsx|mjs)$/.test(entry) ? [full] : [];
  });
}

function envVarsReadByApp(): string[] {
  const files = [
    ...["app", "lib", "components", "providers"].flatMap((dir) =>
      sourceFiles(path.join(frontendDir, dir)),
    ),
    path.join(frontendDir, "middleware.ts"),
    path.join(frontendDir, "next.config.mjs"),
  ];
  const names = new Set<string>();
  for (const file of files) {
    for (const match of readFileSync(file, "utf8").matchAll(
      /process\.env\.([A-Z0-9_]+)/g,
    )) {
      names.add(match[1]);
    }
  }
  return [...names].filter((name) => !NOT_FROM_ENV_FILES.has(name)).sort();
}

function keysInFrontendTemplate(): Set<string> {
  const start = setupScript.indexOf("const frontend = `");
  const end = setupScript.indexOf("`;", start);
  const template = setupScript.slice(start, end);
  return new Set(
    [...template.matchAll(/^([A-Z0-9_]+)=/gm)].map((match) => match[1]),
  );
}

describe("demo frontend env template", () => {
  it("lists every env var the app reads", () => {
    const listed = keysInFrontendTemplate();
    const missing = envVarsReadByApp().filter((name) => !listed.has(name));

    expect(missing).toEqual([]);
  });

  it("turns demo mode on", () => {
    expect(setupScript).toMatch(/const frontend = `[\s\S]*^DEMO_MODE=true$/m);
  });
});
