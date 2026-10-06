import { spawnSync } from "child_process";
import path from "path";

/**
 * Loads the real next.config.mjs in a fresh Node process with only the given
 * env, the way `next dev` / `next build` would, and reports whether it threw.
 */
function loadNextConfig(env: Record<string, string>) {
  const result = spawnSync(
    process.execPath,
    ["--input-type=module", "-e", "await import('./next.config.mjs')"],
    {
      cwd: path.join(__dirname, "../.."),
      env: { NODE_ENV: "test", PATH: process.env.PATH ?? "", ...env },
      encoding: "utf8",
    },
  );
  return { ok: result.status === 0, stderr: result.stderr };
}

describe("next.config.mjs demo mode guard", () => {
  it.each([
    ["APP_URL", "https://www.khouryodyssey.org"],
    ["NEXTAUTH_URL", "https://khouryodyssey.org"],
    ["NEXT_PUBLIC_STRAPI_API_URL", "https://data.khouryodyssey.org"],
    ["STRAPI_API_URL", "https://strapi.odyssey.khoury.northeastern.edu"],
  ])("refuses to start in demo mode when %s is production", (name, url) => {
    const { ok, stderr } = loadNextConfig({ DEMO_MODE: "true", [name]: url });

    expect(ok).toBe(false);
    expect(stderr).toContain("Refusing to start");
  });

  it("starts in demo mode against local URLs", () => {
    const { ok } = loadNextConfig({
      DEMO_MODE: "true",
      APP_URL: "http://localhost:3001",
      NEXTAUTH_URL: "http://localhost:3001",
      NEXT_PUBLIC_STRAPI_API_URL: "http://localhost:1338",
    });

    expect(ok).toBe(true);
  });

  it("allows a hosted demo subdomain", () => {
    const { ok } = loadNextConfig({
      DEMO_MODE: "true",
      APP_URL: "https://demo.khouryodyssey.org",
    });

    expect(ok).toBe(true);
  });

  it("leaves the normal app alone when demo mode is off", () => {
    const { ok } = loadNextConfig({ APP_URL: "https://www.khouryodyssey.org" });

    expect(ok).toBe(true);
  });
});
